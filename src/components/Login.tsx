import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, TowerControl as Control, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

export function Login({ 
  onPortalVerify, 
  isPortalVerified 
}: { 
  onPortalVerify: () => void; 
  isPortalVerified?: boolean; 
}) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const ACCESS_USERNAME = 'FMC';
  const ACCESS_PASSWORD = '1234';

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toUpperCase() === ACCESS_USERNAME && password === ACCESS_PASSWORD) {
      onPortalVerify?.();
      toast.success('Access Granted', { icon: '🛡️' });
    } else {
      toast.error('Invalid Portal Credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-main relative overflow-hidden font-sans">
      {/* Cinematic background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-dark-accent rounded-full mix-blend-screen filter blur-[120px] opacity-[0.07] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full mix-blend-screen filter blur-[120px] opacity-[0.05] animate-pulse delay-700"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md p-10 bg-dark-card rounded-xl shadow-2xl z-10 border border-dark-border relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dark-accent to-transparent opacity-50"></div>
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-dark-accent rounded-xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-900/50 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <Control className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-medium text-white tracking-tight text-center">FMC WEB APPS</h1>
          <p className="text-dark-text-subtle text-center mt-3 font-serif italic text-sm">
            Professional technical service management system for high-performance departments.
          </p>
        </div>

        {!isPortalVerified ? (
          <form onSubmit={handlePortalLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest ml-1">Portal Username</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-dark-accent text-dark-text-subtle">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Username"
                  className="w-full bg-dark-main border border-dark-border rounded-lg py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-dark-accent focus:border-dark-accent transition-all font-mono text-sm tracking-widest uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest ml-1">Portal Access Password</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-dark-accent text-dark-text-subtle">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Verification Key Required"
                  className="w-full bg-dark-main border border-dark-border rounded-lg py-4 pl-12 pr-12 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-dark-accent focus:border-dark-accent transition-all font-mono text-sm tracking-widest"
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
              className="w-full bg-dark-accent hover:bg-dark-accent/90 text-white font-black py-4 px-6 rounded-lg transition-all shadow-xl shadow-dark-accent/10 active:scale-[0.98] uppercase tracking-widest text-xs mt-2"
            >
              Verify Credentials
            </button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Portal Unlocked</p>
                <p className="text-[11px] text-dark-text-subtle">Identity authentication required</p>
              </div>
            </div>

            <button
              id="login-btn"
              onClick={signIn}
              className="w-full flex items-center justify-center gap-4 bg-dark-main hover:bg-dark-sidebar text-slate-200 font-bold py-4 px-6 border border-dark-border rounded-lg transition-all shadow-xl hover:text-white active:scale-[0.97]"
            >
              <LogIn className="w-5 h-5 text-dark-accent" />
              Sign in via Central Auth
            </button>
          </motion.div>
        )}

        <div className="mt-8 pt-6 border-t border-dark-border/20">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <h3 className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-2">Iframe Restriction Detected</h3>
            <p className="text-[11px] text-dark-text-subtle mb-4 leading-relaxed">
              Google Sign-in is blocked inside the chat preview. 
              Please open the app in a real tab to continue.
            </p>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center justify-center w-full gap-2 bg-amber-500 hover:bg-amber-400 text-dark-main text-[11px] font-black py-2.5 px-4 rounded-lg uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10"
            >
              Open in New Tab
            </a>
          </div>
          <div className="mt-8 text-center">
            <span className="text-[10px] font-black text-dark-text-subtle uppercase tracking-[0.2em]">Verified Secure Access Portal</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
