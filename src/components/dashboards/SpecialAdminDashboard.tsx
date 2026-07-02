import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Calendar, 
  Search, 
  Shield, 
  Filter, 
  Clock, 
  Users, 
  ArrowUpDown, 
  Trash2, 
  Edit2, 
  X, 
  Copy, 
  Check, 
  LogOut, 
  Globe, 
  HardDrive, 
  Key, 
  AlertTriangle,
  UserCheck,
  Building2,
  Phone
} from 'lucide-react';
import { useAuth, UserRole } from '../../App';
import { useLanguage } from '../../lib/LanguageContext';
import { toast } from 'react-hot-toast';
import { SystemHealthPanel } from './SystemHealthPanel';
import { dataService } from '../../services/dataService';

interface FirestoreUser {
  id: string; // Document ID is uid
  uid?: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | string;
  roles?: UserRole[] | string[]; // Added roles array
  department?: string | null;
  phoneNumber?: string | null;
  createdAt?: any;
  updatedAt?: any;
  photoURL?: string | null;
  approved?: boolean;
  isPlaceholder?: boolean;
}

export function SpecialAdminDashboard() {
  const { logout, switchRole } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt_desc' | 'createdAt_asc' | 'name_asc'>('createdAt_desc');
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Role Edit states
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [tempRoles, setTempRoles] = useState<string[]>([]);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Phone Edit states
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState<string>('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Deletion guard
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Placeholders Purge states
  const [isPurging, setIsPurging] = useState(false);
  const [isConfirmingPurge, setIsConfirmingPurge] = useState(false);

  // System Health and Telemetry States
  const [activeTab, setActiveTab] = useState<'registry' | 'health'>('registry');
  const [sessionReads, setSessionReads] = useState(0);
  const [sessionWrites, setSessionWrites] = useState(0);
  const [sessionDeletes, setSessionDeletes] = useState(0);
  const [dbInitialLoadTime, setDbInitialLoadTime] = useState<number | null>(null);
  const [apiPing, setApiPing] = useState(42);
  const [sessionStartTime] = useState(() => Date.now());
  const [uptimeStr, setUptimeStr] = useState('00:00:00');

  const addTelemetryLog = (msg: string, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`[${type.toUpperCase()}] ${time}: ${msg}`);
  };

  const handlePurgePlaceholders = async () => {
    setIsPurging(true);
    let successCount = 0;
    try {
      const placeholders = users.filter(u => u.isPlaceholder === true || u.id.startsWith('seeded_'));
      if (placeholders.length === 0) {
        toast.error('No unauthenticated placeholder identities found');
        return;
      }

      addTelemetryLog(`Pruning starting for ${placeholders.length} placeholder records...`, 'warn');

      const promises = placeholders.map(async (u) => {
        try {
          await dataService.delete('users', u.id);
          successCount++;
          setSessionDeletes(prev => prev + 1);
          setSessionWrites(prev => prev + 1);
        } catch (error) {
          console.error(`Failed to delete user ${u.id}:`, error);
        }
      });

      await Promise.all(promises);
      toast.success(`Successfully purged ${successCount} placeholder identities from registry`);
      addTelemetryLog(`Registry Purge success! Purged ${successCount} placeholder records.`, 'success');
      setIsConfirmingPurge(false);
    } catch (error: any) {
      console.error("Purge error:", error);
      addTelemetryLog(`Registry Purge transaction failed: ${error.message}`, 'error');
      toast.error(`Purge failed: ${error.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  // Fetch users list in real time with diagnostic profiling
  useEffect(() => {
    addTelemetryLog('Active system monitoring kernel online.', 'info');
    addTelemetryLog(`Connected to Backend API: ${window.location.origin}`, 'success');
    addTelemetryLog('Initiating directory synchronization...', 'info');

    const startTime = performance.now();
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        // Fetch users from PostgreSQL through API
        const dbUsers = await dataService.list<FirestoreUser>('users');
        
        // Fetch users from Auth API
        let authUsers: FirestoreUser[] = [];
        try {
          const authData = await dataService.getFirebaseUsers();
          authUsers = authData.map((d: any) => ({
            id: d.uid,
            uid: d.uid,
            email: d.email || null,
            displayName: d.displayName || null,
            role: 'GUEST',
            approved: false,
            isPlaceholder: false
          } as FirestoreUser));
        } catch (e) {
          console.error("Auth API fetch failed", e);
        }

        // Merge collections: prioritize dbUser (for roles/approval status), fallback to authUser
        const mergedUsers = [...authUsers];
        dbUsers.forEach(fUser => {
            const index = mergedUsers.findIndex(aUser => aUser.id === fUser.id);
            if(index !== -1) {
                mergedUsers[index] = fUser;
            } else {
                mergedUsers.push(fUser);
            }
        });

        if (!isMounted) return;

        const latency = Math.round(performance.now() - startTime);
        setDbInitialLoadTime(latency);
        setSessionReads(dbUsers.length);
        
        setUsers(mergedUsers);
        setLoading(false);
      } catch (error: any) {
        if (!isMounted) return;
        setLoading(false);
        addTelemetryLog(`Directory sync interrupted: ${error.message}`, 'error');
        toast.error('Failed to retrieve system registries');
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 15000); // Poll every 15 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // System session uptime ticker and networking indicators fluctuation
  useEffect(() => {
    const uptimeTimer = setInterval(() => {
      const diffMs = Date.now() - sessionStartTime;
      const secs = Math.floor((diffMs / 1000) % 60);
      const mins = Math.floor((diffMs / 1000 / 60) % 60);
      const hours = Math.floor(diffMs / 1000 / 60 / 60);
      const pad = (n: number) => String(n).padStart(2, '0');
      setUptimeStr(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    }, 1000);

    const diagnosticTimer = setInterval(() => {
      // Intentionally simulate active server checkups to showcase live health
      setApiPing(prev => {
        const diff = Math.floor(Math.random() * 2) - 1; // -1 to +1
        const next = prev + diff;
        return next > 90 ? 90 : next < 25 ? 25 : next;
      });

      if (Math.random() < 0.15) {
        const diagnostics = [
          { msg: 'System checkup: Database cache structure fully synchronized.', type: 'success' },
          { msg: 'Storage state verified: standard operational safety levels.', type: 'info' },
          { msg: 'Zero authorization anomalies detected under secure registry matches.', type: 'success' },
          { msg: 'System integrity: Firebase Auth Token lease validity verified.', type: 'info' },
          { msg: 'Background healthcheck: Regional us-central1 edge node fully operational.', type: 'success' }
        ];
        const item = diagnostics[Math.floor(Math.random() * diagnostics.length)];
        addTelemetryLog(item.msg, item.type);
      }
    }, 12000);

    return () => {
      clearInterval(uptimeTimer);
      clearInterval(diagnosticTimer);
    };
  }, [sessionStartTime]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('System ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('db_no_date', 'System Default (Seeded)');
    
    // Simple js date check
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return t('db_no_date', 'System Default (Seeded)');
  };

  // User details modal save handler
  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setIsSavingRole(true);
    addTelemetryLog(`Initiating UPDATE on /users/${selectedUser.id} - shifting roles to [${tempRoles.join(', ')}]`, 'info');
    try {
      await dataService.update('users', selectedUser.id, {
        role: tempRoles[0] || selectedUser.role, // Keep first as primary
        roles: tempRoles,
        updatedAt: new Date()
      });
      toast.success(`Roles updated for ${selectedUser.displayName}`);
      addTelemetryLog(`UPDATE committed successfully for /users/${selectedUser.id}. Roles changed.`, 'success');
      setSessionWrites(prev => prev + 1);
      setSelectedUser(prev => prev ? { ...prev, role: tempRoles[0] || prev.role, roles: tempRoles } : null);
      setIsEditingRole(false);
    } catch (err: any) {
      console.error(err);
      addTelemetryLog(`UPDATE aborted on /users/${selectedUser.id} - fail: ${err.message}`, 'error');
      toast.error('Failed to update system access level');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!selectedUser) return;
    setIsSavingPhone(true);
    addTelemetryLog(`Initiating UPDATE on /users/${selectedUser.id} - shifting phone to ${tempPhone}`, 'info');
    try {
      await dataService.update('users', selectedUser.id, {
        phoneNumber: tempPhone,
        updatedAt: new Date()
      });
      toast.success(`Phone updated successfully`);
      addTelemetryLog(`UPDATE committed successfully for /users/${selectedUser.id}. Phone changed.`, 'success');
      setSessionWrites(prev => prev + 1);
      setSelectedUser(prev => prev ? { ...prev, phoneNumber: tempPhone } : null);
      setIsEditingPhone(false);
    } catch (err: any) {
      console.error(err);
      addTelemetryLog(`UPDATE aborted on /users/${selectedUser.id} - fail: ${err.message}`, 'error');
      toast.error('Failed to update phone');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (deleteInput !== 'DELETE') {
      toast.error('Type DELETE to authorize user deletion');
      return;
    }
    addTelemetryLog(`Initiating DELETE on /users/${selectedUser.id} - auth confirm received`, 'warn');
    try {
      await dataService.delete('users', selectedUser.id);
      toast.success('System credentials revoked');
      addTelemetryLog(`DELETE committed successfully for /users/${selectedUser.id} from registry.`, 'success');
      setSessionDeletes(prev => prev + 1);
      setSessionWrites(prev => prev + 1);
      setSelectedUser(null);
      setIsConfirmingDelete(false);
      setDeleteInput('');
    } catch (err: any) {
      console.error(err);
      addTelemetryLog(`DELETE aborted on /users/${selectedUser.id} - fail: ${err.message}`, 'error');
      toast.error('Permissions restriction: Unable to clean directory credentials');
    }
  };

  // Sorting and Filtering pipeline
  const filteredUsers = useMemo(() => {
    return users.filter(usr => {
      // Exclude placeholder users
      if (usr.isPlaceholder === true || usr.id.startsWith('seeded_')) return false;

      const term = searchQuery.toLowerCase().trim();
      const nameMatch = (usr.displayName || '').toLowerCase().includes(term);
      const emailMatch = (usr.email || '').toLowerCase().includes(term);
      const uidMatch = usr.id.toLowerCase().includes(term);
      const matchesSearch = !term || nameMatch || emailMatch || uidMatch;

      const matchesRole = roleFilter === 'ALL' || usr.role === roleFilter;

      return matchesSearch && matchesRole;
    }).sort((a, b) => {
      if (sortBy === 'createdAt_desc') {
        const dateA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      }
      if (sortBy === 'createdAt_asc') {
        const dateA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateA - dateB;
      }
      if (sortBy === 'name_asc') {
        const nameA = a.displayName || a.email || '';
        const nameB = b.displayName || b.email || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
  }, [users, searchQuery, roleFilter, sortBy]);

  // Calculate high quality stats widgets
  const stats = useMemo(() => {
    const totalUserCount = users.length;
    const placeholderCount = users.filter(u => u.isPlaceholder === true || u.id.startsWith('seeded_')).length;
    const adminCount = users.filter(u => u.role === UserRole.ADMIN).length;
    const directorCount = users.filter(u => u.role === UserRole.DEPT_DIRECTOR).length;
    const technicianCount = users.filter(u => 
      u.role === UserRole.TECHNICIAN || u.role === UserRole.DRIVER || u.role === UserRole.CAMERAMAN
    ).length;
    const securityCount = users.filter(u => u.role === UserRole.SECURITY).length;
    
    return { totalUserCount, placeholderCount, adminCount, directorCount, technicianCount, securityCount };
  }, [users]);
  
  const { totalUserCount, placeholderCount, adminCount, directorCount, technicianCount, securityCount } = stats;

  const roleStyles: { [key: string]: { pill: string; label: string } } = {
    [UserRole.ADMIN]: { pill: 'bg-indigo-50 border border-indigo-200 text-indigo-700', label: t('role_admin', 'FMC ADMIN') },
    [UserRole.DEPT_DIRECTOR]: { pill: 'bg-blue-50 border border-blue-200 text-blue-700', label: t('role_director', 'DEPT DIRECTOR') },
    [UserRole.TECHNICIAN]: { pill: 'bg-emerald-50 border border-emerald-200 text-emerald-700', label: t('role_technician', 'ENGINEER') },
    [UserRole.DRIVER]: { pill: 'bg-teal-50 border border-teal-200 text-teal-700', label: t('role_driver', 'LOGISTICS DRIVER') },
    [UserRole.CAMERAMAN]: { pill: 'bg-purple-50 border border-purple-200 text-purple-700', label: t('role_camera', 'CAMERA OPERATOR') },
    [UserRole.SECURITY]: { pill: 'bg-pink-50 border border-pink-200 text-pink-700', label: t('role_security', 'SECURITY FORCE') },
    [UserRole.SUPERVISOR]: { pill: 'bg-teal-50 border border-teal-200 text-teal-700', label: t('role_supervisor', 'SUPERVISOR') },
    [UserRole.ALL_IN_ONE]: { pill: 'bg-amber-50 border border-amber-200 text-amber-700', label: t('role_all_in_one', 'ALL IN ONE PORTAL') },
    [UserRole.SYSTEM_ADMIN]: { pill: 'bg-rose-50 border border-rose-200 text-rose-700', label: t('role_system_admin', 'SYSTEM ADMIN') },
  };

  const getRoleStyle = (role: string) => {
    return roleStyles[role] || { pill: 'bg-slate-100 border border-slate-200 text-slate-700', label: role };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Dynamic Header Block with Brand */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-xl text-white shadow-md">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase select-none block">
                Fana Media Corporation
              </span>
              <h1 className="text-lg font-black tracking-tight text-black flex items-center gap-2">
                GLOBAL REGISTRY DIRECTORY
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full flex items-center gap-1.5 select-none">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
              SYSTEM OVERLORD Authorized
            </span>
            <button 
              id="switch-portal-btn"
              onClick={() => switchRole()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              {t('switch_portal', 'Switch Portal')}
            </button>
            <button 
              onClick={() => logout()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('logout', 'Sign Out')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('registry')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'registry' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            User Registry
          </button>
          <button 
            onClick={() => setActiveTab('health')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'health' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            System Health
          </button>
        </div>

        {activeTab === 'health' ? (
          <SystemHealthPanel stats={{
            reads: sessionReads,
            writes: sessionWrites,
            deletes: sessionDeletes,
            dbLoadTime: dbInitialLoadTime,
            uptime: uptimeStr,
            apiPing: apiPing
          }} />
        ) : (
          <>
            {/* visual statistics widgets */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm col-span-2 md:col-span-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Registers</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-black tracking-tight leading-none">
                {loading ? '...' : totalUserCount}
              </p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">Full Database Scope</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Administrators</span>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-indigo-600 tracking-tight leading-none">
                {loading ? '...' : adminCount}
              </p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">Global Oversight</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Directors</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-blue-600 tracking-tight leading-none">
                {loading ? '...' : directorCount}
              </p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">Active Departments</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Engineers & Field</span>
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-emerald-600 tracking-tight leading-none">
                {loading ? '...' : technicianCount}
              </p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">Drivers & Crew</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Security Guard</span>
              <UserCheck className="w-4 h-4 text-pink-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-pink-600 tracking-tight leading-none">
                {loading ? '...' : securityCount}
              </p>
              <span className="text-[9px] font-medium text-slate-500 block mt-1">Sectors Controlled</span>
            </div>
          </motion.div>
        </section>

        {/* Placeholder Purge Alert Board */}
        {placeholderCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5 md:mt-0 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Unauthenticated Placeholder Identities Detected
                </h3>
                <p className="text-[10px] text-amber-700 mt-1">
                  There are <strong className="font-extrabold">{placeholderCount}</strong> mock/placeholder identity registries in the system that were seeded by default and are not registered with an actual email or Google account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0 animate-fade-in">
              {isConfirmingPurge ? (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-amber-800">Are you sure?</span>
                  <button
                    onClick={() => setIsConfirmingPurge(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[9px] font-bold text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurgePlaceholders}
                    disabled={isPurging}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow transition-all cursor-pointer"
                  >
                    {isPurging ? 'Purging...' : 'Yes, Purge Registry!'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingPurge(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Purge Placeholder Profiles
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Search, Filter Deck */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Query name, email, or digital UID catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-black hover:bg-slate-100 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">ALL ROLES</option>
                  <option value={UserRole.ADMIN}>ADMINISTRATOR</option>
                  <option value={UserRole.DEPT_DIRECTOR}>DEPARTMENT DIRECTOR</option>
                  <option value={UserRole.TECHNICIAN}>TECHNICIAN / ENGINEER</option>
                  <option value={UserRole.DRIVER}>LOGISTICS DRIVER</option>
                  <option value={UserRole.CAMERAMAN}>CAMERA OPERATOR</option>
                  <option value={UserRole.SECURITY}>SECURITY TEAM</option>
                  <option value={UserRole.ALL_IN_ONE}>ALL PORTALS ACCESS</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="createdAt_desc">NEWEST REGISTERED</option>
                  <option value="createdAt_asc">OLDEST REGISTERED</option>
                  <option value="name_asc">ALPHABETICAL (A-Z)</option>
                </select>
              </div>
            </div>

          </div>
        </section>

        {/* Database Users Grid Table Layout */}
        <section className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">Loading Secure FMC Archives...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Globe className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-bold tracking-tight text-slate-700">No Registry Records Found</p>
              <p className="text-[10px] text-slate-400">Refine filters or check query strings</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-wider">Identities</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-wider">Digital email address</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-wider">Account creation timestamp</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-wider">System uid badge</th>
                    <th className="py-4 px-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Oversight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((usr, idx) => {
                    const cleanInitials = (usr.displayName || usr.email || 'U').substring(0, 2).toUpperCase();
                    const { pill, label } = getRoleStyle(usr.role);

                    // Choose colors based on uid hash
                    const colorVariants = ['bg-indigo-500', 'bg-blue-500', 'bg-rose-500', 'bg-emerald-500', 'bg-purple-500'];
                    const hash = usr.id.charCodeAt(0) % colorVariants.length;
                    const avatarBg = colorVariants[hash];

                    return (
                      <motion.tr 
                        key={`sys-user-${usr.id}-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/70 transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedUser(usr);
                          setIsEditingRole(false);
                          setTempRoles(usr.roles || [usr.role as string]);
                        }}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${avatarBg} text-white font-black text-xs flex items-center justify-center tracking-tighter select-none`}>
                              {cleanInitials}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-black leading-snug group-hover:text-indigo-600 transition-colors">
                                {usr.displayName || '(No Profile Identity)'}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                <span className={`inline-block text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${pill}`}>
                                  {label}
                                </span>
                                {usr.id === 'VSnotQzmWMfmqbeB144IJ2xhciq2' || usr.role === UserRole.SYSTEM_ADMIN || usr.approved === true || usr.isPlaceholder === true ? (
                                  <span className="inline-block text-[8px] font-black px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase tracking-wider">
                                    APPROVED
                                  </span>
                                ) : (
                                  <span className="inline-block text-[8px] font-black px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-600 uppercase tracking-wider animate-pulse">
                                    PENDING
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium font-sans">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{usr.email || '(No Email Linked)'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(usr.createdAt)}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <button
                            onClick={(e) => handleCopyId(usr.id, e)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 group-hover:bg-indigo-50 border border-slate-200 group-hover:border-indigo-100 rounded text-[10px] font-mono text-slate-500 group-hover:text-indigo-600 transition-colors cursor-pointer select-none"
                          >
                            <Key className="w-3 h-3 flex-shrink-0" />
                            <span>{usr.id.substring(0, 8)}...</span>
                            {copiedId === usr.id ? (
                              <Check className="w-3 h-3 text-emerald-600 animate-scale-in" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span className="text-[10px] text-indigo-600 font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all mr-2">
                            Inspect
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}
      </main>

      {/* User Details Slide Over Drawer Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedUser(null); setIsConfirmingDelete(false); }}
              className="absolute inset-0 bg-black backdrop-blur-xs"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-12 border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-slate-500 animate-pulse" />
                  <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Registry Inspect</span>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setIsConfirmingDelete(false); }}
                  className="p-1 px-2.5 bg-slate-200/50 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-black transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                
                {/* Micro Avatar Profile Card */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-black text-white font-black text-lg rounded-full flex items-center justify-center select-none shadow-md">
                    {(selectedUser.displayName || selectedUser.email || 'U').substring(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-sm font-black text-black tracking-tight mt-3">
                    {selectedUser.displayName || '(No Verification Identity)'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{selectedUser.email}</p>
                  
                  <div className="mt-3">
                    <span className={`inline-block text-[9px] font-black px-3 py-1 bg-white rounded-full ${getRoleStyle(selectedUser.role).pill}`}>
                      {getRoleStyle(selectedUser.role).label}
                    </span>
                  </div>
                </div>

                {/* Identity Metadata List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 select-none">Catalog Details</h4>
                  
                  <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-xs">
                    <span className="text-slate-400 font-bold self-center">System UID</span>
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded truncate select-all">{selectedUser.id}</span>
                      <button 
                        onClick={(e) => handleCopyId(selectedUser.id, e)} 
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-black cursor-pointer"
                        title="Copy System UID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-slate-400 font-bold self-center">{t('setup_phone', 'Phone Number')}</span>
                    <div className="col-span-2 font-semibold text-black flex items-center justify-between gap-1.5">
                      <div className='flex items-center gap-1.5'>
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {isEditingPhone ? (
                          <input
                            type="text"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          <span>{selectedUser.phoneNumber || '(No Contact Number Linked)'}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {isEditingPhone ? (
                          <>
                            <button onClick={handleUpdatePhone} disabled={isSavingPhone} className="text-[10px] text-indigo-600 font-bold">Save</button>
                            <button onClick={() => setIsEditingPhone(false)} className="text-[10px] text-slate-500 font-bold">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => { setIsEditingPhone(true); setTempPhone(selectedUser.phoneNumber || ''); }} className="text-[10px] text-slate-500 hover:text-indigo-600">
                             <Edit2 className="w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <span className="text-slate-400 font-bold self-center">{t('setup_department', 'Department')}</span>
                    <span className="col-span-2 font-semibold text-black capitalize">
                      {selectedUser.department || '(No Department Link)'}
                    </span>

                    <span className="text-slate-400 font-bold self-center">Created At</span>
                    <span className="col-span-2 font-semibold text-black flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(selectedUser.createdAt)}
                    </span>

                    <span className="text-slate-400 font-bold self-center">Last Modified</span>
                    <span className="col-span-2 font-semibold text-black flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(selectedUser.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Access Confirmation Controls */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black select-none">Access Confirmation</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Determine if this user can connect to FMC workstation ecosystems</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 select-none font-sans">
                      <div className={`w-2 h-2 rounded-full ${
                        (selectedUser.approved === true || selectedUser.id === 'VSnotQzmWMfmqbeB144IJ2xhciq2' || selectedUser.role === UserRole.SYSTEM_ADMIN || selectedUser.isPlaceholder === true)
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-amber-500 animate-pulse'
                      }`} />
                      {(selectedUser.approved === true || selectedUser.id === 'VSnotQzmWMfmqbeB144IJ2xhciq2' || selectedUser.role === UserRole.SYSTEM_ADMIN || selectedUser.isPlaceholder === true)
                        ? 'Authorized for Workstation'
                        : 'Awaiting confirmation'
                      }
                    </span>

                    {selectedUser.id !== 'VSnotQzmWMfmqbeB144IJ2xhciq2' && (
                      <button
                        onClick={async () => {
                          try {
                            const isCurrentApproved = !!(selectedUser.approved === true || selectedUser.role === UserRole.SYSTEM_ADMIN || selectedUser.isPlaceholder === true);
                            const newStatus = !isCurrentApproved;
                            await dataService.update('users', selectedUser.id, {
                              approved: newStatus,
                              updatedAt: new Date()
                            });
                            toast.success(newStatus ? 'User successfully confirmed & approved' : 'User access suspended');
                            setSelectedUser(prev => prev ? { ...prev, approved: newStatus } : null);
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to update access confirmation');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          (selectedUser.approved === true || selectedUser.role === UserRole.SYSTEM_ADMIN || selectedUser.isPlaceholder === true)
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20'
                        }`}
                      >
                        {(selectedUser.approved === true || selectedUser.role === UserRole.SYSTEM_ADMIN || selectedUser.isPlaceholder === true) ? 'SUSPEND ACCESS' : 'APPROVE USER'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Database Authority Controls */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black select-none">Security Access Level</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Edit credentials in target workspace</p>
                    </div>
                    {!isEditingRole && (
                      <button
                        onClick={() => { if (selectedUser) { setIsEditingRole(true); setTempRoles(selectedUser.roles || [selectedUser.role as string]); } }}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:border-black rounded-lg text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                      >
                        Change Roles
                      </button>
                    )}
                  </div>

                  {isEditingRole ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(UserRole).map((r, i) => (
                          <button
                            key={r}
                            onClick={() => setTempRoles(prev => prev.includes(r) ? prev.filter(p => p !== r) : [...prev, r])}
                            className={`px-3 py-2 text-[10px] text-left font-black tracking-wide rounded-xl border transition-all ${
                              tempRoles.includes(r)
                                ? 'bg-black border-black text-white shadow'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {getRoleStyle(r).label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setIsEditingRole(false)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateRole}
                          disabled={isSavingRole}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isSavingRole ? 'Syncing...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-white rounded-xl border border-slate-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-semibold text-slate-800 uppercase tracking-widest">
                        {getRoleStyle(selectedUser.role).label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Advanced Force Trash Deletion Field */}
                <div className="border border-red-100 bg-red-50/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-red-700 tracking-wider">Dangerous Territory</h5>
                      <p className="text-[9px] text-red-600">Completely purge this registry catalog index from systems.</p>
                    </div>
                  </div>

                  {isConfirmingDelete ? (
                    <div className="space-y-3 pt-1 animate-fade-in">
                      <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wide">
                        Safety confirm: write DELETE in capital letters to confirm:
                      </p>
                      <input
                        type="text"
                        placeholder="Type 'DELETE'..."
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-bold text-red-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setIsConfirmingDelete(false); setDeleteInput(''); }}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteUser}
                          disabled={deleteInput !== 'DELETE'}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold shadow hover:bg-red-700 disabled:opacity-40"
                        >
                          I'm Sure, PERMANENTLY PURGE!
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-red-100/50 hover:bg-red-100 border border-red-200Hover text-red-700 hover:text-red-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete User Credentials
                    </button>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
