import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, TowerControl as Control, Lock, Eye, EyeOff, User, Monitor, ShieldCheck, Cpu, Terminal, AlertCircle } from 'lucide-react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

type TerminalType = 'ADMIN_TERMINAL' | 'REQUEST_PORTAL';

interface TerminalConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  expectedUser: string;
  expectedKey: string;
  color: string;
}

const TERMINAL_CONFIGS: Record<TerminalType, TerminalConfig> = {
  ADMIN_TERMINAL: {
    id: 'ADMIN-SYS-X1',
    label: 'FMC ADMIN TERMINAL',
    icon: <ShieldCheck className="w-5 h-5 text-red-500" />,
    expectedUser: 'ADMIN',
    expectedKey: '0000',
    color: 'border-red-500/30 text-red-500',
  },
  REQUEST_PORTAL: {
    id: 'REQ-OPS-P2',
    label: 'FMC REQUEST PORTAL',
    icon: <Terminal className="w-5 h-5 text-dark-accent" />,
    expectedUser: 'FMC',
    expectedKey: '1234',
    color: 'border-dark-accent/30 text-dark-accent',
  },
};

export function Login({ 
  onPortalVerify, 
  isPortalVerified
}: { 
  onPortalVerify: () => void; 
  isPortalVerified?: boolean;
}) {
  const { signIn } = useAuth();
  const [terminalType, setTerminalType] = useState<TerminalType>('REQUEST_PORTAL');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const config = TERMINAL_CONFIGS[terminalType];
    
    if (username.toUpperCase() === config.expectedUser && password === config.expectedKey) {
      onPortalVerify?.();
      toast.success(`${config.label} ACCESS GRANTED`, { 
        icon: '🛡️',
        style: {
          background: '#0f172a',
          color: '#fff',
          border: '1px solid #1e293b'
        }
      });
    } else {
      toast.error('INVALID SYSTEM CREDENTIALS', {
        style: {
          background: '#450a0a',
          color: '#fca5a5',
          border: '1px solid #7f1d1d'
        }
      });
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono overflow-hidden">
        <div className="max-w-md w-full p-8 text-emerald-500 space-y-4">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-3 h-3 bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-black tracking-widest uppercase">Initializing Secure Boot...</span>
          </div>
          <div className="space-y-2 opacity-80">
            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-[10px]">{'>>'} KERNEL LOADED: FMC-v4.0.2</motion.p>
            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="text-[10px]">{'>>'} ESTABLISHING ENCRYPTED HANDSHAKE... OK</motion.p>
            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="text-[10px]">{'>>'} MOUNTING SECURITY MODULES... OK</motion.p>
            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="text-[10px]">{'>>'} ACCESSING TERMINAL ENDPOINT: {TERMINAL_CONFIGS[terminalType].id}</motion.p>
          </div>
          <div className="h-1 w-full bg-emerald-900/30 mt-8 overflow-hidden rounded-full">
            <motion.div 
               initial={{ x: "-100%" }}
               animate={{ x: "0%" }}
               transition={{ duration: 1.5, ease: "easeInOut" }}
               className="h-full w-full bg-emerald-500"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-mono">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }}></div>

      {/* Atmospheric Glitches */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-dark-accent/20 animate-scanline"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-8 bg-black rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] z-10 border border-[#1a1a1a] relative overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-10 border-b border-[#1a1a1a] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-dark-accent/10 rounded-lg flex items-center justify-center border border-dark-accent/20">
              <Control className="w-6 h-6 text-dark-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-[0.2em] uppercase">Security Terminal</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">System Online</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-text-subtle uppercase tracking-widest leading-none">Terminal ID</p>
            <p className="text-xs text-white font-bold tracking-wider mt-1">{TERMINAL_CONFIGS[terminalType].id}</p>
          </div>
        </div>

        {!isPortalVerified ? (
          <div className="space-y-8">
            {/* Terminal Mode Switcher */}
            <div className="grid grid-cols-2 gap-4">
              {(Object.entries(TERMINAL_CONFIGS) as [TerminalType, TerminalConfig][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setTerminalType(type)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all duration-300",
                    terminalType === type 
                      ? `${config.color} bg-white/5 font-black border-opacity-100 ring-1 ring-inset ring-current` 
                      : "border-[#1a1a1a] text-dark-text-subtle hover:bg-white/2 hover:text-white"
                  )}
                >
                  {config.icon}
                  <span className="text-[9px] uppercase tracking-[0.15em]">{config.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handlePortalLogin} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between px-1">
                  <label className="text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Auth Username
                  </label>
                  <span className="text-[9px] text-dark-accent/50 font-mono italic">Required</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    placeholder="Enter Username"
                    className="w-full bg-black border border-[#1a1a1a] rounded-md py-4 px-6 text-white placeholder:text-slate-800 focus:outline-none focus:border-dark-accent transition-all font-mono text-sm tracking-widest uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between px-1">
                  <label className="text-[10px] font-bold text-dark-text-subtle uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Encrypted Key
                  </label>
                  <span className="text-[9px] text-dark-accent/50 font-mono italic">Secure Input</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-black border border-[#1a1a1a] rounded-md py-4 px-6 text-white placeholder:text-slate-800 focus:outline-none focus:border-dark-accent transition-all font-mono text-sm tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-dark-text-subtle hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                className={cn(
                  "w-full font-black py-5 px-6 rounded-md transition-all active:scale-[0.98] uppercase tracking-[0.3em] text-xs mt-4 group relative overflow-hidden",
                  terminalType === 'ADMIN_TERMINAL' ? "bg-red-600 hover:bg-red-500" : "bg-dark-accent hover:bg-dark-accent/90"
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  Initialize Authentication
                  <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
            </form>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-black border border-[#1a1a1a] p-6 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-widest uppercase">Endpoint Verified</h3>
                  <p className="text-[10px] text-emerald-500 font-mono mt-1">SECURE_LINK_STABILIZED</p>
                </div>
              </div>
              <div className="space-y-1 text-[10px] font-mono text-dark-text-subtle border-t border-[#1a1a1a] pt-4">
                <p>PROTOCOL: TLS 1.3</p>
                <p>CIPHER: AES_256_GCM</p>
                <p>LOCATION: PORTAL_{terminalType}</p>
              </div>
            </div>

            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-4 bg-white text-black font-black py-5 px-6 rounded-md transition-all shadow-xl hover:scale-[1.01] active:scale-[0.97] uppercase tracking-[0.2em] text-xs"
            >
              <Cpu className="w-5 h-5" />
              Primary Auth Interface
            </button>
            
            <p className="text-center text-[10px] text-dark-text-subtle font-mono animate-pulse">
              Waiting for user interaction...
            </p>
          </motion.div>
        )}

        <div className="mt-12 pt-8 border-t border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-dark-accent/40">
             <AlertCircle className="w-3 h-3" />
             <span className="text-[9px] uppercase tracking-widest font-black">Official Terminal</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-[9px] text-dark-text-subtle border border-[#1a1a1a] px-2 py-1 rounded font-mono">FMC-SEC-OS</div>
             <div className="text-[9px] text-dark-text-subtle border border-[#1a1a1a] px-2 py-1 rounded font-mono">NODE-042</div>
          </div>
        </div>
      </motion.div>

      {/* Footer System Status */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[8px] text-dark-text-subtle/30 font-mono uppercase tracking-[0.3em]">
        <div className="flex items-center gap-8">
          <span>Cpu: {isTyping ? 'Load 82%' : 'Idle 14%'}</span>
          <span>Mem: 4.2Gb/16Gb</span>
          <span>Net: 844 Mbps</span>
        </div>
        <div className="flex items-center gap-4">
          <span>© 2026 FMC SECURITY DIV.</span>
          <span className="text-dark-accent/50 group-hover:text-dark-accent transition-colors cursor-help">Terms_of_Use</span>
        </div>
      </div>
    </div>
  );
}
