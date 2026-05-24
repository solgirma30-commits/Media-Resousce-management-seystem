import React from 'react';
import { motion } from 'motion/react';
import { TowerControl as Control, ShieldCheck, Cpu, AlertCircle, Globe } from 'lucide-react';
import { useAuth } from '../App';
import { useLanguage } from '../lib/LanguageContext';

export function Login() {
  const { signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 relative overflow-hidden font-mono text-white">
      {/* Dynamic Floating Language Switcher */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-slate-900/80 border border-dark-border rounded-full px-3 py-1.5 text-xs text-dark-text-subtle">
        <Globe className="w-3.5 h-3.5 text-dark-accent" />
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase ${language === 'en' ? 'bg-dark-accent text-white font-bold' : 'hover:text-white text-dark-text-subtle'}`}
        >
          EN
        </button>
        <span className="opacity-35 select-none text-[8px]">|</span>
        <button
          onClick={() => setLanguage('om')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase ${language === 'om' ? 'bg-dark-accent text-white font-bold' : 'hover:text-white text-dark-text-subtle'}`}
        >
          OM
        </button>
        <span className="opacity-35 select-none text-[8px]">|</span>
        <button
          onClick={() => setLanguage('am')}
          className={`px-2 py-0.5 rounded transition-all text-[10px] font-black uppercase ${language === 'am' ? 'bg-dark-accent text-white font-bold' : 'hover:text-white text-dark-text-subtle'}`}
        >
          አማ
        </button>
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-40 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }}></div>

      {/* Atmospheric Glitches */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-dark-accent/20 animate-scanline"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-8 bg-black rounded-xl shadow-[0_0_50px_rgba(0,0,0,1)] z-10 border border-dark-border relative overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-10 border-b border-dark-border pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-dark-accent/10 rounded-lg flex items-center justify-center border border-dark-accent/20">
              <Control className="w-6 h-6 text-dark-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-[0.2em] uppercase">{t('login_security_terminal', 'Security Terminal')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{t('login_system_online', 'System Online')}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-text-subtle uppercase tracking-widest leading-none">{t('login_access_node', 'Access Point')}</p>
            <p className="text-xs text-white font-bold tracking-wider mt-1">NODE-AUTH-01</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="bg-dark-card border border-dark-border p-6 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest uppercase">{t('login_secure_access_point', 'Secure Access Point')}</h3>
                <p className="text-[10px] text-emerald-500 font-mono mt-1">ENCRYPTION_STABILIZED</p>
              </div>
            </div>
            <p className="text-xs text-dark-text-subtle leading-relaxed mb-4">
              {t('login_welcome_msg', 'Welcome to the Field Management Center. Please authenticate using your official credentials to access the operational vector.')}
            </p>
            <div className="space-y-1 text-[10px] font-mono text-dark-accent/60 border-t border-dark-border pt-4">
              <p>PROTOCOL: OAuth 2.0 / Firebase Auth</p>
              <p>STATUS: AWAITING_CREDENTIALS</p>
            </div>
          </div>

          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-4 bg-white text-black font-black py-5 px-6 rounded-md transition-all shadow-xl hover:scale-[1.01] active:scale-[0.97] uppercase tracking-[0.2em] text-xs group cursor-pointer"
          >
            <Cpu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            {t('login_authenticate_google', 'Authenticate with Google')}
          </button>
          
          <p className="text-center text-[10px] text-dark-text-subtle font-mono animate-pulse">
            {t('login_waiting_handshake', 'Connection secure. Waiting for biometric handshake...')}
          </p>
        </motion.div>

        <div className="mt-12 pt-8 border-t border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-dark-accent/40">
             <AlertCircle className="w-3 h-3" />
             <span className="text-[9px] uppercase tracking-widest font-black">{t('login_official_fmc_terminal', 'Official FMC Terminal')}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-[9px] text-dark-text-subtle border border-dark-border px-2 py-1 rounded font-mono">FMC-SEC-OS</div>
             <div className="text-[9px] text-dark-text-subtle border border-dark-border px-2 py-1 rounded font-mono">X-742</div>
          </div>
        </div>
      </motion.div>

      {/* Footer System Status */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[8px] text-dark-text-subtle/30 font-mono uppercase tracking-[0.3em]">
        <div className="flex items-center gap-8">
          <span>Cpu: Idle 4%</span>
          <span>Mem: 2.1Gb/16Gb</span>
          <span>Net: 1.2 Gbps</span>
        </div>
        <div className="flex items-center gap-4">
          <span>© 2026 FMC TECH DIV.</span>
          <span className="text-dark-accent/50 group-hover:text-dark-accent transition-colors cursor-help">Security_Policy</span>
        </div>
      </div>
    </div>
  );
}
