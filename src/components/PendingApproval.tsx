import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LogOut, Clock, RefreshCw, UserCheck, Mail, Building2, Phone, Globe } from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';

export function PendingApproval() {
  const { user, profile, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Standard visual feedback. Firestore onSnapshot in App.tsx is already real-time,
    // but a manual trigger is extremely assuring to unconfirmed users.
    setTimeout(() => {
      setIsRefreshing(false);
      if (profile?.approved) {
        toast.success(t('auth_approved_success', 'Your account has been approved! Redirecting...'));
      } else {
        toast.error(t('auth_pending_toast', 'Account still pending confirmation. Please consult the system admin.'));
      }
    }, 1200);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return t('role_admin', 'FMC ADMIN');
      case 'DEPT_DIRECTOR': return t('role_director', 'DEPT DIRECTOR');
      case 'TECHNICIAN': return t('role_technician', 'ENGINEER');
      case 'DRIVER': return t('role_driver', 'LOGISTICS DRIVER');
      case 'CAMERAMAN': return t('role_camera', 'CAMERA OPERATOR');
      case 'SECURITY': return t('role_security', 'SECURITY FORCE');
      case 'ALL_IN_ONE': return t('role_all_in_one', 'ALL ACCESS');
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-dark-main flex items-center justify-center p-4 font-sans text-black relative">
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-dark-card rounded-2xl shadow-2xl p-6 md:p-8 border border-dark-border text-center flex flex-col items-center"
      >
        {/* Animated Hourglass Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-500">
            <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-white">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Header Titles */}
        <h2 className="text-2xl font-black text-black tracking-tight uppercase">
          {t('approval_required', 'CONFIRMATION REQUIRED')}
        </h2>
        <p className="text-dark-text-subtle mt-2 font-serif italic text-sm text-center max-w-sm">
          {t('approval_desc', 'Your profile is awaiting authorization from the System Administrator')}
        </p>

        {/* The Digital Credentials Badge */}
        <div className="w-full bg-dark-main/40 border border-dark-border rounded-xl p-5 my-6 text-left space-y-4">
          <div className="border-b border-dark-border pb-3 flex justify-between items-center">
            <span className="text-[10px] uppercase font-black tracking-widest text-dark-text-subtle">FMC Identity Pass</span>
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
              <span className="w-1 h-1 bg-amber-500 rounded-full animate-ping" />
              {t('state_pending', 'PENDING')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-black">
            <div className="space-y-1">
              <span className="block text-[8px] uppercase tracking-widest text-dark-text-subtle font-black">Full Name</span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-dark-accent" />
                {profile?.displayName || user?.displayName || t('none', 'N/A')}
              </span>
            </div>

            <div className="space-y-1">
              <span className="block text-[8px] uppercase tracking-widest text-dark-text-subtle font-black">Registered Email</span>
              <span className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-dark-accent" />
                {profile?.email || user?.email || t('none', 'N/A')}
              </span>
            </div>

            <div className="space-y-1">
              <span className="block text-[8px] uppercase tracking-widest text-dark-text-subtle font-black">Requested Role</span>
              <span className="inline-block mt-0.5 text-[10px] bg-dark-sidebar border border-dark-border px-2 py-0.5 rounded text-black font-black uppercase tracking-wide">
                {getRoleLabel(profile?.role || '')}
              </span>
            </div>

            {profile?.department && (
              <div className="space-y-1">
                <span className="block text-[8px] uppercase tracking-widest text-dark-text-subtle font-black">Department</span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-dark-accent" />
                  {profile.department}
                </span>
              </div>
            )}

            {profile?.phoneNumber && (
              <div className="space-y-1 col-span-1 md:col-span-2">
                <span className="block text-[8px] uppercase tracking-widest text-dark-text-subtle font-black">Contact Number</span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-dark-accent" />
                  {profile.phoneNumber}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Informative text */}
        <p className="text-xs font-medium text-dark-text-subtle mb-6 max-w-sm leading-relaxed">
          {t('approval_long_desc', 'For security and safety oversight within the Fana Media Corporation network, all portal connections require verified confirmation. Please contact the administrator to activate your digital workstation catalog badge.')}
        </p>

        {/* Interactive Controls */}
        <div className="w-full space-y-3">
          <button
            id="refresh-approval-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2.5 bg-dark-accent hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? t('checking', 'Checking...') : t('check_status', 'Verify Confirmation')}
          </button>

          <button
            id="pending-logout-btn"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 bg-transparent hover:bg-dark-main border border-dark-border text-dark-text-subtle hover:text-black font-bold py-3 px-5 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('logout', 'Sign Out')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
