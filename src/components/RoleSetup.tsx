import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, UserRound, Wrench, ArrowRight, Truck, Camera, Globe } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth, UserRole } from '../App';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/LanguageContext';

export function RoleSetup({ onComplete }: { onComplete: () => void }) {
  const { user, profile: existingProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(existingProfile?.role || null);
  const [fullName, setFullName] = useState(existingProfile?.displayName || user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(existingProfile?.phoneNumber || '');
  const [department, setDepartment] = useState(existingProfile?.department || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = [
    {
      id: UserRole.ADMIN,
      title: 'FMC ADMIN',
      description: 'Fleet management & oversight.',
      icon: Shield,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      id: UserRole.DEPT_DIRECTOR,
      title: 'FMC REQUEST',
      description: 'Request & track services.',
      icon: UserRound,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      id: UserRole.TECHNICIAN,
      title: 'FMC ENGINEERS',
      description: 'Execute service tasks.',
      icon: Wrench,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      id: UserRole.DRIVER,
      title: 'FMC DRIVERS',
      description: 'Logistics & transport.',
      icon: Truck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      id: UserRole.CAMERAMAN,
      title: 'FMC CAMERA OPERATORS',
      description: 'Media & event coverage.',
      icon: Camera,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      id: UserRole.SECURITY,
      title: 'FMC SECURITY',
      description: 'Asset exit permit verification.',
      icon: Shield,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
    },
    {
      id: UserRole.ALL_IN_ONE,
      title: 'ALL IN ONE PORTAL',
      description: 'Unified global registry for all assets.',
      icon: Globe,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
  ];

  const handleComplete = async () => {
    if (!user || !selectedRole) return;
    if (!fullName) {
      toast.error('Identity update failed: User Name specification required');
      return;
    }
    if (!phoneNumber) {
      toast.error('Identity update failed: Contact Number specification required');
      return;
    }
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone.startsWith('+')) {
      toast.error('Contact Number must start with + and include country code (e.g. +251...)');
      return;
    }
    if (/[a-zA-Z?*]/.test(cleanPhone)) {
      toast.error('Contact Number cannot contain alphabetical characters or unverified masks (e.g. XXXX)');
      return;
    }
    if (selectedRole === UserRole.DEPT_DIRECTOR && !department) {
      toast.error('Identity update failed: Department specification required');
      return;
    }

    setIsSubmitting(true);
    const path = `users/${user.uid}`;
    try {
      const profile: any = {
        uid: user.uid,
        email: user.email,
        displayName: fullName,
        phoneNumber: phoneNumber,
        role: selectedRole,
        department: department || null,
        updatedAt: serverTimestamp(),
      };

      if (!existingProfile) {
        profile.createdAt = serverTimestamp();
      }

      if (user.photoURL) {
        profile.photoURL = user.photoURL;
      }

      await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
      toast.success('System credentials generated');
      onComplete();
    } catch (error) {
      console.error("Role setup error:", error);
      toast.error('Failed to sync identity credentials');
      // We don't throw here to avoid unhandled rejections that might freeze the UI
      // but we still call handleFirestoreError for logging if desired
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch {
        // Silent
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-main flex items-center justify-center p-4 font-sans text-black font-bold overflow-y-auto relative">
      {/* Floating Language Switcher */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-dark-card border border-dark-border rounded-full px-3 py-1.5 text-xs text-dark-text-subtle">
        <Globe className="w-3.5 h-3.5 text-dark-accent" />
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase cursor-pointer ${language === 'en' ? 'bg-dark-accent text-white font-bold' : 'hover:text-slate-900 text-dark-text-subtle'}`}
        >
          EN
        </button>
        <span className="opacity-35 select-none text-[8px]">|</span>
        <button
          onClick={() => setLanguage('om')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase cursor-pointer ${language === 'om' ? 'bg-dark-accent text-white font-bold' : 'hover:text-slate-900 text-dark-text-subtle'}`}
        >
          OM
        </button>
        <span className="opacity-35 select-none text-[8px]">|</span>
        <button
          onClick={() => setLanguage('am')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase cursor-pointer ${language === 'am' ? 'bg-dark-accent text-white font-bold' : 'hover:text-slate-900 text-dark-text-subtle'}`}
        >
          አማ
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-dark-card rounded-xl shadow-2xl p-6 md:p-10 border border-dark-border my-8"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-black tracking-tight">{t('role_resource_mgmt', 'FMC RESOURCE MANAGEMENT')}</h2>
          <p className="text-dark-text-subtle mt-2 font-serif italic text-sm">{t('role_define_role', 'Define your operational role within the TechFlow ecosystem')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {roles.map((role) => (
            <button
              id={`role-${role.id}`}
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "flex flex-col items-center p-6 rounded-xl border transition-all text-left group relative",
                selectedRole === role.id 
                  ? `${role.border} bg-dark-main/60 ring-1 ring-dark-accent/40` 
                  : "border-dark-border bg-dark-main/30 hover:bg-dark-main/50 hover:border-dark-text-muted"
              )}
            >
              <div className={cn("p-3 rounded-lg mb-4 transition-all duration-300", 
                 selectedRole === role.id ? role.bg + " scale-110 shadow-lg" : "bg-dark-sidebar"
              )}>
                <role.icon className={cn("w-6 h-6", selectedRole === role.id ? role.color : "text-dark-text-subtle")} />
              </div>
              <h3 className="font-black text-black text-xs uppercase tracking-widest mb-2">
                {role.id === UserRole.ADMIN ? t('fmc_admin', 'FMC ADMIN') :
                 role.id === UserRole.DEPT_DIRECTOR ? t('fmc_request', 'FMC REQUEST') :
                 role.id === UserRole.TECHNICIAN ? t('fmc_engineers', 'FMC ENGINEERS') :
                 role.id === UserRole.DRIVER ? t('fmc_drivers', 'FMC DRIVERS') :
                 role.id === UserRole.CAMERAMAN ? t('fmc_cameramen', 'FMC CAMERA OPERATORS') :
                 role.id === UserRole.SECURITY ? t('fmc_security', 'FMC SECURITY') :
                 role.title}
              </h3>
              <p className="text-[10px] text-dark-text-subtle text-center leading-relaxed font-medium">{role.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t('role_user_name', 'User Name')}</label>
              <input
                type="text"
                placeholder="e.g. john_doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-5 py-4 rounded-lg bg-dark-main border border-dark-border text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all placeholder:text-dark-text-subtle text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">{t('role_contact_password', 'Password / Contact Number')}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-5 py-4 rounded-lg bg-dark-main border border-dark-border text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all placeholder:text-dark-text-subtle text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-10">
          <div>
            <label className="block text-[10px] font-black text-dark-text-subtle uppercase tracking-widest mb-3">
              {t('role_dept_label', 'Operational Department')} {selectedRole === UserRole.DEPT_DIRECTOR && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="dept-input"
              type="text"
              placeholder="e.g. Finance Sector, Strategic Ops"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-5 py-4 rounded-lg bg-dark-main border border-dark-border text-black font-bold focus:ring-1 focus:ring-dark-accent outline-none transition-all placeholder:text-dark-text-subtle text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            id="complete-setup-btn"
            disabled={!selectedRole || isSubmitting}
            onClick={handleComplete}
            className="w-full flex items-center justify-center gap-3 bg-dark-accent hover:bg-indigo-600 disabled:opacity-20 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-xl shadow-indigo-900/30 active:scale-[0.98] uppercase tracking-widest text-xs cursor-pointer"
          >
            {isSubmitting ? t('saving', 'Syncing...') : t('role_init_portal', 'Initialize Portal')}
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
          
          {existingProfile && (
            <button
              onClick={onComplete}
              className="w-full py-4 text-xs font-black text-dark-text-subtle hover:text-white uppercase tracking-widest transition-all cursor-pointer"
            >
              {t('role_discard_changes', 'Discard Changes')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
