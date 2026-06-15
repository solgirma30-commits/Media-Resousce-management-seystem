import { useState, useEffect } from 'react';
import { useFcmToken } from '../hooks/useFcmToken';
import { Smartphone, Bell, AlertCircle, CheckCircle2, Info, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../lib/LanguageContext';

export function MobileNotificationBanner() {
  const { token, permission, requestNotificationPermission } = useFcmToken();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Detect iOS to customize PWA installation explanation
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);
  }, []);

  // Check if we are running in standalone mode (installed PWA)
  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone);

  const handleActivate = async () => {
    try {
      const res = await requestNotificationPermission();
      if (Notification.permission === 'granted') {
        toast.success(t('Background push alerts configured successfully!', 'Background push alerts configured successfully!'));
      } else if (Notification.permission === 'denied') {
        toast.error(t('Notification permission was blocked. Please reset site permissions in your browser settings.', 'Notification permission was blocked. Please reset site permissions in your browser settings.'));
      }
    } catch (err) {
      console.error('Request permission failed:', err);
      toast.error(t('Permission request failed or was interrupted.', 'Permission request failed or was interrupted.'));
    }
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full mb-6"
      >
        <div className="bg-gradient-to-r from-dark-card to-dark-sidebar border border-dark-border rounded-xl p-5 shadow-2xl relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
            <Smartphone className="w-48 h-48 -mr-10 -mb-10 text-white" />
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-dark-accent/10 border border-dark-accent/20 text-dark-accent shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>{t('Mobile Background Alerts Setup', 'Mobile Background Alerts Setup')}</span>
                  {permission === 'granted' ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-mono tracking-widest uppercase rounded">
                      {t('Active', 'Active')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-mono tracking-widest uppercase rounded">
                      {t('Pending Setup', 'Pending Setup')}
                    </span>
                  )}
                </h4>
                <button 
                  onClick={() => setIsDismissed(true)}
                  className="text-dark-text-muted hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {permission === 'granted' ? (
                <div className="text-xs text-dark-text-subtle space-y-2">
                  <p className="flex items-center gap-1.5 text-emerald-400 font-medium font-sans">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {t('System fully armed. You will receive dispatch alerts even if the app or phone screen is closed.', 'System fully armed. You will receive dispatch alerts even if the app or phone screen is closed.')}
                  </p>
                  <p className="text-[10px] text-dark-text-muted font-mono bg-dark-main/30 p-2 rounded border border-dark-border/40 inline-block overflow-x-auto max-w-full">
                    Token Registry ID: {token ? `${token.substring(0, 18)}...` : 'Generating Handshake...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                    {t('Receive push notifications in the background on your phone when new assignments, status updates, or broadcasts are dispatched.', 'Receive push notifications in the background on your phone when new assignments, status updates, or broadcasts are dispatched.')}
                  </p>

                  {/* Dynamic OS Guidance */}
                  <div className="bg-dark-main/50 border border-dark-border/60 rounded-lg p-3 text-[11px] text-slate-600 space-y-2 max-w-xl">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-dark-accent" />
                      {t('How to receive alerts before opening the app:', 'How to receive alerts before opening the app:')}
                    </p>
                    
                    {isIos ? (
                      <ol className="list-decimal pl-4 space-y-1 font-sans text-xs">
                        <li>
                          {t('Tap the browser Share button (box with upward arrow) at the bottom or top of your screen.', 'Tap the browser Share button (box with upward arrow) at the bottom or top of your screen.')}
                        </li>
                        <li>
                          {t("Scroll down and select 'Add to Home Screen'.", "Scroll down and select 'Add to Home Screen'.")}
                        </li>
                        <li>
                          {t('Launch the installed app from your home screen (not in Safari browser).', 'Launch the installed app from your home screen (not in Safari browser).')}
                        </li>
                        <li className="font-semibold text-dark-accent">
                          {t("Tap the 'Activate Background Alerts' button below and click 'Allow' in the pop-up prompt.", "Tap the 'Activate Background Alerts' button below and click 'Allow' in the pop-up prompt.")}
                        </li>
                      </ol>
                    ) : (
                      <ol className="list-decimal pl-4 space-y-1 font-sans text-xs">
                        {!isStandalone && (
                          <li>
                            {t("Install this application: open your browser options and tap 'Install' or 'Add to Home Screen'.", "Install this application: open your browser options and tap 'Install' or 'Add to Home Screen'.")}
                          </li>
                        )}
                        <li>
                          {t("Tap 'Activate Background Alerts' below.", "Tap 'Activate Background Alerts' below.")}
                        </li>
                        <li className="font-semibold text-dark-accent">
                          {t("Choose 'Allow' when your device asks for notification permissions to activate background alerts.", "Choose 'Allow' when your device asks for notification permissions to activate background alerts.")}
                        </li>
                      </ol>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      onClick={handleActivate}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-dark-accent hover:bg-opacity-90 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-dark-accent/20 group"
                    >
                      <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      {t('Activate Background Alerts', 'Activate Background Alerts')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {!isIos && !isStandalone && (
                      <div className="flex items-center gap-2 text-[10px] text-dark-text-muted font-mono uppercase tracking-tight">
                        <span>●</span> {t('Add to Home Screen for absolute reliability', 'Add to Home Screen for absolute reliability')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
