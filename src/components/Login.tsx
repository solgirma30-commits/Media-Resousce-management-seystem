import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Globe } from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../lib/LanguageContext';

export function Login() {
  const { signIn, signingIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden font-sans text-black">
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
        className="w-full max-w-sm p-10 bg-white rounded-2xl shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col items-center text-center"
      >
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-8"
        >
           {/* Company Logo */}
           <img 
             src="/1749120286829_FMC_New_Logo.jfif" 
             alt="Fana Media Corporation"
             className="h-28 object-contain"
             onError={(e) => {
               // Fallback if image path is incorrect
               e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Fana_Broadcasting_Corporate_Logo.png/600px-Fana_Broadcasting_Corporate_Logo.png';
             }}
           />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-6"
        >
          <button
            onClick={signIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[0.98] uppercase tracking-wide text-xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <div className="w-5 h-5 flex-shrink-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Cpu className="w-5 h-5 flex-shrink-0 group-hover:rotate-12 transition-transform" />
            )}
            {signingIn ? t('login_signing_in', 'Authenticating...') : t('login_authenticate_google', 'Authenticate with Google')}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
