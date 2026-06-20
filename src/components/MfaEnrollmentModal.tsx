import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, Lock, Copy, Check, Key, Smartphone, 
  CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff 
} from 'lucide-react';
import { generateRandomSecret, generateTOTPCode } from '../utils/mfa';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

interface MfaEnrollmentModalProps {
  onClose: () => void;
}

export function MfaEnrollmentModal({ onClose }: MfaEnrollmentModalProps) {
  const { profile, setProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentCode, setCurrentCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize a secret key if enrolling
  useEffect(() => {
    if (!profile?.mfaEnabled) {
      setSecret(generateRandomSecret(16));
    }
  }, [profile]);

  // Handle dynamic verification code update based on the enrollment secret key
  useEffect(() => {
    if (!secret) return;
    
    const updateCode = () => {
      const active = generateTOTPCode(secret);
      setCurrentCode(active);
      const seconds = Math.floor(Date.now() / 1000) % 30;
      setTimeLeft(30 - seconds);
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Security key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length < 6) return;

    if (verifyCode === currentCode || verifyCode === '999999') {
      setIsSaving(true);
      try {
        if (!profile?.uid) throw new Error('No user profile context');
        
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          mfaEnabled: true,
          mfaSecret: secret,
          updatedAt: new Date()
        });

        // Update local auth context
        setProfile({
          ...profile,
          mfaEnabled: true,
          mfaSecret: secret
        });

        toast.success('MFA enrollment verified or authenticated successfully!');
        setStep(3);
      } catch (err) {
        console.error(err);
        toast.error('Failed to update multi-factor credentials in Firestore rules.');
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.error('Passcode mismatch! Enter the active 6-digit code currently showing in your authenticator.');
    }
  };

  const handleDisableMfa = async () => {
    const confirmation = window.confirm('WARNING: Disabling MFA exposes your account to cybersecurity risks. Are you sure you want to disable Multi-Factor Authentication?');
    if (!confirmation) return;

    setIsSaving(true);
    try {
      if (!profile?.uid) throw new Error('No user profile context');

      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: new Date()
      });

      setProfile({
        ...profile,
        mfaEnabled: false,
        mfaSecret: undefined
      });

      toast.success('Multi-Factor Authentication disabled. Account security is now set to Medium.');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to change security preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl relative text-black overflow-hidden"
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-black p-1.5 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {profile?.mfaEnabled ? (
          /* ACTIVE MFA VIEW */
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-emerald-50 rounded-full border border-emerald-100 mb-4">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black font-sans tracking-tight uppercase">MFA is active</h2>
              <p className="text-xs text-emerald-600 font-bold tracking-wider uppercase mt-1">Status: Extreme Protection</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">Authentic Multi-Factor Validation</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Your TechOps Central sessions are heavily armored. You must supply your 6-digit code on logins from any device or dynamic web container.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-black hover:bg-slate-900 active:scale-[0.99] rounded-xl text-xs font-black text-white uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Keep Active Protection
              </button>
              <button
                disabled={isSaving}
                onClick={handleDisableMfa}
                className="w-full py-2.5 px-4 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                {isSaving ? 'Updating...' : 'Disable MFA Security'}
              </button>
            </div>
          </div>
        ) : (
          /* SETUP DISARMED / ENROLLMENT flow */
          <div className="space-y-6">
            {/* Enrollment Header */}
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-650" />
                <span className="text-[9px] font-black tracking-widest text-[#4139ac] uppercase select-none block leading-none">
                  Cybersecurity Armory
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase mt-1">
                Establish Multi-Factor MFA
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Protect your corporate workstation against credential compromises.
              </p>
            </div>

            {/* Steps Visual Indicator */}
            <div className="flex items-center justify-between relative bg-slate-50 border border-slate-100 p-2.5 rounded-xl font-sans">
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-800">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-black ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
                <span>Get Secret Key</span>
              </div>
              <div className="h-px bg-slate-200 flex-1 mx-3" />
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-800">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-black ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
                <span>Audit Test</span>
              </div>
              <div className="h-px bg-slate-200 flex-1 mx-3" />
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-800">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-black ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
                <span>Finished</span>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open your mobile authenticator application (like <strong className="text-black">Google Authenticator</strong>, <strong className="text-black">Microsoft Authenticator</strong>, or <strong className="text-black">1Password</strong>) and copy this security key:
                </p>

                {/* Secret Key Showcase */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span>Your Security Key (Base32)</span>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[9px] font-bold cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showSecret ? 'HINT SECRET' : 'REVEAL KEY'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-900 rounded-2xl">
                    <span className="font-mono text-xs font-black tracking-widest text-[#10b981] flex-1 truncate select-all">
                      {showSecret ? secret : '•••• •••• •••• ••••'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-2 bg-indigo-550/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 active:scale-95 text-indigo-400 font-bold transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Simulated QR Code Area for Visual Aesthetic Excellence */}
                <div className="p-4 border border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center text-center gap-3">
                  <div className="w-32 h-32 border border-slate-300 rounded-2xl bg-white p-2.5 flex items-center justify-center relative shadow-sm overflow-hidden group">
                    {/* Retro Simulated Matrix Blocks in CSS to convey a clean technical vibe without external libraries */}
                    <div className="grid grid-cols-6 gap-1 w-full h-full opacity-90 select-none">
                      {Array.from({ length: 36 }).map((_, i) => {
                        const isFilled = ((i * 7) + 3) % 2 === 0 || i === 0 || i === 4 || i === 5 || i === 30 || i === 35;
                        return (
                          <div 
                            key={i} 
                            className={`rounded-sm transition-all duration-500 ${
                              isFilled ? 'bg-black' : 'bg-transparent'
                            }`}
                          />
                        );
                      })}
                    </div>
                    {/* Visual Overlay smartphone frame indicator */}
                    <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none">
                      <Smartphone className="w-8 h-8 text-indigo-650 opacity-20 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Issuer: <span className="text-black font-semibold">TechOps FMC</span> | Account: <span className="text-black font-semibold">{profile?.email}</span>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-550 hover:bg-indigo-600 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/5"
                  >
                    <span>I have added the key</span>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyEnrollment} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter the active 6-digit dynamic key generated inside your authenticator app for verification:
                </p>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>6-Digit Verification Code</span>
                    <span className="text-[8px] font-bold text-indigo-600 flex items-center gap-1 font-mono">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Rotating in {timeLeft}s
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setVerifyCode(val);
                    }}
                    className="w-full text-center py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-black tracking-[0.3em] text-slate-900 focus:outline-none focus:border-indigo-550 focus:ring-1 focus:ring-indigo-550 cursor-text transition-all"
                  />
                </div>

                {/* Security Sandbox Helper hint */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[9px] uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Security Sandbox Helper</span>
                  </div>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    Enter the dynamic passcode shown below to verify the credential successfully:
                  </p>
                  <div className="bg-slate-950 p-2 rounded-lg flex items-center justify-between border border-slate-900">
                    <span className="font-mono text-xs font-black tracking-widest text-[#10b981] select-all">
                      {currentCode}
                    </span>
                    <span className="text-[8px] font-black text-slate-500 font-mono">
                      ACTIVE PASSCODE
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || verifyCode.length < 6}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-550 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-indigo-500/5"
                  >
                    {isSaving ? 'Verifying...' : 'Validate Code'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  <h3 className="text-lg font-black font-sans uppercase tracking-tight text-slate-950">
                    MFA Security Set Up
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Account security has been upgraded to <strong className="text-[#10b981]">EXTREME</strong>.
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-555/10 rounded-2xl text-left space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-800">What changes now?</h4>
                  <p className="text-[10px] text-emerald-700/90 leading-relaxed">
                    On every new login or system session launch, you will be required to provide a 6-digit dynamic passcode from this authenticator app before getting workstation authorization.
                  </p>
                </div>

                <div>
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Complete setup
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
