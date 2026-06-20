import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Cpu, Globe, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../lib/LanguageContext';
import { toast } from 'react-hot-toast';

export function Login() {
  const { signIn, signInWithEmail, signUpWithEmail, signingIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('login_fill_fields', 'Please fill in all fields'));
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      toast.error(t('login_password_mismatch', 'Passwords do not match'));
      return;
    }

    setLocalLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch (err) {
      // Error notifications are already handled and triggered in signInWithEmail / signUpWithEmail
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden font-sans text-black py-12 px-4 sm:px-6 lg:px-8">
      {/* Dynamic Floating Language Switcher */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-600">
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase ${language === 'en' ? 'bg-black text-white font-bold' : 'hover:text-black text-slate-500'}`}
        >
          EN
        </button>
        <span className="opacity-35 select-none text-[8px]">|</span>
        <button
          onClick={() => setLanguage('om')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase ${language === 'om' ? 'bg-black text-white font-bold' : 'hover:text-black text-slate-500'}`}
        >
          OM
        </button>
        <span className="opacity-35 select-none text-[8px]">|</span>
        <button
          onClick={() => setLanguage('am')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase ${language === 'am' ? 'bg-black text-white font-bold' : 'hover:text-black text-slate-500'}`}
        >
          አማ
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 md:p-10 bg-white rounded-2xl shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col items-center"
      >
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-4 flex justify-center"
        >
           {/* High-Fidelity Custom Vector SVG Fana Media Corporation Logo */}
           <svg viewBox="0 0 280 220" className="w-48 h-auto" xmlns="http://www.w3.org/2000/svg" id="fmc-vector-logo">
             <defs>
               <linearGradient id="sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#fbbf24" />
                 <stop offset="100%" stopColor="#f59e0b" />
               </linearGradient>
             </defs>

             {/* Red orbiting swoosh */}
             <path 
               d="M 12,130 C 12,100, 268,70, 268,100 C 268,130, 12,160, 12,130 Z" 
               fill="none" 
               stroke="#c22032" 
               strokeWidth="6" 
               strokeLinecap="round" 
               transform="rotate(-11, 140, 115)"
             />

             {/* Top Amharic Text "ፋና" */}
             <text 
               x="140" 
               y="55" 
               textAnchor="middle" 
               fill="#105ca3" 
               fontSize="32" 
               fontWeight="bold" 
               fontFamily="'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif"
               letterSpacing="2"
             >
               ፋና
             </text>

             {/* Main FMC Bold letters */}
             <g transform="translate(15, -10)">
               {/* Letter F */}
               <text 
                 x="55" 
                 y="145" 
                 fill="#105ca3" 
                 fontSize="68" 
                 fontWeight="900" 
                 fontFamily="system-ui, -apple-system, sans-serif"
               >
                 F
               </text>

               {/* Letter M */}
               <text 
                 x="92" 
                 y="145" 
                 fill="#105ca3" 
                 fontSize="68" 
                 fontWeight="900" 
                 fontFamily="system-ui, -apple-system, sans-serif"
               >
                 M
               </text>

               {/* Letter C */}
               <text 
                 x="158" 
                 y="145" 
                 fill="#105ca3" 
                 fontSize="68" 
                 fontWeight="900" 
                 fontFamily="system-ui, -apple-system, sans-serif"
               >
                 C
               </text>

               {/* Lightning Bolt Cutting Through Letter M */}
               <polygon 
                 points="114,92 129,92 120,114 132,114 116,142 122,120 112,120" 
                 fill="#105ca3" 
                 stroke="white"
                 strokeWidth="2.5"
                 strokeLinejoin="miter"
               />

               {/* Golden Sun inside Letter C */}
               <circle 
                 cx="187" 
                 cy="120" 
                 r="13" 
                 fill="url(#sun-grad)" 
               />
             </g>

             {/* Website text on the red orbit */}
             <text 
               x="140" 
               y="156" 
               textAnchor="middle" 
               fill="#475569" 
               fontSize="10" 
               fontFamily="sans-serif"
               fontWeight="bold"
               opacity="0.85"
             >
               www.fanamc.com
             </text>

             {/* Bottom Company Designation */}
             <text 
               x="140" 
               y="188" 
               textAnchor="middle" 
               fill="#134e4a" 
               fontSize="10.5" 
               fontWeight="bold" 
               fontFamily="'Noto Sans Ethiopic', sans-serif"
             >
               ፋና ሚዲያ ኮርፖሬሽን እ.ማ
             </text>
             <text 
               x="140" 
               y="204" 
               textAnchor="middle" 
               fill="#0f172a" 
               fontSize="11" 
               fontWeight="black" 
               fontFamily="sans-serif"
             >
               Fana Media Corporation S.C
             </text>
           </svg>
        </motion.div>

        {/* Auth Mode Tabs */}
        <div className="w-full flex border-b border-slate-100 mb-6">
          <button
            onClick={() => { setMode('signin'); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              mode === 'signin' 
                ? 'border-black text-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('login_tab_signin', 'Sign In')}
          </button>
          <button
            onClick={() => { setMode('signup'); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              mode === 'signup' 
                ? 'border-black text-black' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t('login_tab_signup', 'Register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4 mb-5">
          <div className="text-left animate-fade-in">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {t('login_email', 'Email Address')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@fanamc.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-black placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
              />
            </div>
          </div>

          <div className="text-left">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {t('login_password', 'Password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-black placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-left"
            >
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {t('login_confirm_password', 'Confirm Password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-black placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={signingIn || localLoading}
            className="w-full mt-2 flex items-center justify-center gap-3 bg-black text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:bg-slate-900 active:scale-[0.98] uppercase tracking-wide text-xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localLoading ? (
              <div className="w-4 h-4 flex-shrink-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              <LogIn className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <UserPlus className="w-4 h-4 flex-shrink-0 group-hover:scale-105 transition-transform" />
            )}
            {localLoading
              ? t('login_processing', 'Processing...')
              : mode === 'signin'
              ? t('login_tab_signin', 'Sign In')
              : t('login_tab_signup', 'Register')}
          </button>
        </form>

        <div className="w-full flex items-center gap-3 mb-5">
          <div className="h-[1px] bg-slate-100 flex-1" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 select-none">
            {t('login_or', 'Or')}
          </span>
          <div className="h-[1px] bg-slate-100 flex-1" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <button
            onClick={signIn}
            disabled={signingIn || localLoading}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[0.98] uppercase tracking-wide text-xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <div className="w-4 h-4 flex-shrink-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Cpu className="w-4 h-4 flex-shrink-0 group-hover:rotate-12 transition-transform" />
            )}
            {signingIn ? t('login_signing_in', 'Authenticating...') : t('login_authenticate_google', 'Authenticate with Google')}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

