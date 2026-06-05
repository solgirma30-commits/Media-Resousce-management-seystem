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
           className="mb-6 flex justify-center"
        >
           {/* High-Fidelity Custom Vector SVG Fana Media Corporation Logo */}
           <svg viewBox="0 0 280 220" className="w-56 h-auto" xmlns="http://www.w3.org/2000/svg" id="fmc-vector-logo">
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
