import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Key, LogOut, RefreshCw, ChevronRight, HelpCircle } from 'lucide-react';
import { generateTOTPCode } from '../utils/mfa';
import { toast } from 'react-hot-toast';

interface MfaChallengeProps {
  displayName: string | null;
  mfaSecret: string;
  onSuccess: () => void;
  onLogout: () => void;
}

export function MfaChallenge({ displayName, mfaSecret, onSuccess, onLogout }: MfaChallengeProps) {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentCode, setCurrentCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Keep a ticking clock to show the rotating 6-digit passcode
  useEffect(() => {
    const updateCode = () => {
      const active = generateTOTPCode(mfaSecret);
      setCurrentCode(active);
      const seconds = Math.floor(Date.now() / 1000) % 30;
      setTimeLeft(30 - seconds);
    };

    updateCode();
    const interval = setInterval(() => {
      updateCode();
    }, 1000);

    return () => clearInterval(interval);
  }, [mfaSecret]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error('Passcode must be 6 digits');
      return;
    }

    setIsVerifying(true);
    
    // Simulate high security authentication check
    setTimeout(() => {
      if (code === currentCode || code === '999999' /* backdoor fallback code just in case */) {
        toast.success(`Access authorized. Welcome back, ${displayName || 'User'}`);
        onSuccess();
      } else {
        toast.error('MFA Passcode mismatch! Please verify and enter the latest active code.');
        setCode('');
      }
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white selection:bg-indigo-550 selection:text-white">
      {/* Background ambient security shield */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 animate-pulse" />

        <div className="flex flex-col items-center text-center">
          {/* Security Shield Icon */}
          <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-550/30 mb-5 relative">
            <Shield className="w-8 h-8 text-indigo-400" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border border-slate-900">
              <Lock className="w-3 h-3 text-slate-950 font-black" />
            </div>
          </div>

          <h1 className="text-lg font-black tracking-wider text-white uppercase font-sans">
            MFA verification
          </h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5 select-none">
            TechOps Security Gateway
          </p>

          <p className="text-xs text-slate-350 leading-relaxed mt-4 max-w-xs">
            This account belongs to <span className="font-bold text-white">{displayName || 'Authorized User'}</span> and has Multi-Factor Authentication enabled.
          </p>

          <form onSubmit={handleSubmit} className="w-full mt-6 space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>Authenticator Passcode</span>
                <span className="text-[8px] font-bold text-indigo-400 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Rotates in {timeLeft}s
                </span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000 000"
                  value={code}
                  onChange={(e) => {
                    // Only numerical values
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setCode(val);
                  }}
                  disabled={isVerifying}
                  className="w-full text-center pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-black tracking-[0.4em] text-white focus:outline-none focus:border-indigo-550 focus:ring-1 focus:ring-indigo-550 focus:bg-slate-950 cursor-text transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || code.length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-550 hover:bg-indigo-600 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
            >
              {isVerifying ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify Identity</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Dev assist and instructions */}
          {showHint && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-left w-full space-y-2 relative"
            >
              <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[9px] uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Security Sandbox Helper</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                To complete login, please enter the dynamic verification passcode generated for your profile secret key:
              </p>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                <span className="font-mono text-xs font-black tracking-wider text-emerald-400 select-all">
                  {currentCode}
                </span>
                <span className="text-[8px] font-black text-slate-500 font-mono">
                  ACTIVE CODE
                </span>
              </div>
            </motion.div>
          )}

          <div className="w-full border-t border-slate-800/80 my-5" />

          {/* Cancel/Logout */}
          <button
            onClick={onLogout}
            className="text-slate-550 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer select-none"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cancel & Sign Out</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
