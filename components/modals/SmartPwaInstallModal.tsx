'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, Share2, PlusSquare, ArrowUpRight, CheckCircle2, X, Sparkles, ArrowDown, ShieldCheck } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { useAppStore } from '@/store/useAppStore';

export const SmartPwaInstallModal = () => {
  const { showPwaModal, setShowPwaModal } = useAppStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    if (typeof window !== 'undefined') return (window as any).deferredPwaPrompt || null;
    return null;
  });
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isNavStandalone = (navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    return isStandaloneMedia || isNavStandalone || isAndroidApp;
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [platform] = useState<'ANDROID' | 'IOS' | 'DESKTOP'>(() => {
    if (typeof window === 'undefined') return 'ANDROID';
    const ua = navigator.userAgent || '';
    if (/iphone|ipad|ipod/i.test(ua)) return 'IOS';
    if (/android/i.test(ua)) return 'ANDROID';
    return 'DESKTOP';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture Native PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPwaPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Auto-Open Trigger Logic (Spy / Espía)
    const hidePreference = localStorage.getItem('ribergo_hide_install_prompt') === 'true';
    if (!isStandalone && !hidePreference) {
      const timer = setTimeout(() => {
        setShowPwaModal(true);
        try { audio.messageReceived(); } catch(e) {}
      }, 2500); // 2.5s delay allows splash screen and main map to load fully
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setShowPwaModal, isStandalone]);;

  const handleClose = () => {
    haptics.selection();
    if (dontShowAgain) {
      localStorage.setItem('ribergo_hide_install_prompt', 'true');
    }
    setShowPwaModal(false);
  };

  const handleInstallClick = async () => {
    haptics.heavy();
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
        setShowPwaModal(false);
      }
      setDeferredPrompt(null);
    } else {
      haptics.notification();
      if (platform === 'IOS' || platform === 'ANDROID') {
        // If they click install but no deferred prompt, maybe just jiggle the UI to show instructions
        // Not much else to do natively, instructions are already visible!
      } else {
         setShowPwaModal(false);
      }
    }
  };

  // If app is already installed/standalone and modal wasn't explicitly forced open, render nothing.
  if (isStandalone && !showPwaModal) return null;

  return (
    <AnimatePresence>
      {showPwaModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4 perspective-1000">
          {/* Backdrop with aggressive blur and dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-xl"
          />

          <motion.div
            initial={{ y: '100%', scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: '100%', scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-[430px] sm:max-w-md bg-white/5 border border-white/10 sm:rounded-3xl rounded-t-3xl p-6 text-white shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-3xl z-10"
          >
            {/* Elegant glassmorphism gradients */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#eab30822_100%)] animate-[spin_8s_linear_infinite] pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/20 blur-3xl rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl shrink-0">
                    <img
                      src="/logo.png"
                      alt="RiberGO Logo"
                      className="w-full h-full object-contain rounded-2xl border border-gold-primary/40 shadow-xl shadow-gold-primary/20"
                    />
                  </div>
                  <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold-primary tracking-[0.2em]">
                      <Sparkles className="w-3 h-3" />
                      Instalación
                    </span>
                    <h3 className="text-xl font-extrabold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                      RiberGO App
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message */}
              <p className="text-[13px] text-white/70 leading-relaxed">
                Instala nuestra app oficial para una experiencia ultrarrápida. Disfruta de 
                <span className="text-white font-bold"> notificaciones push</span>, 
                acceso directo en tu pantalla de inicio y navegación sin distracciones.
              </p>

              {/* Smart Instructions Box */}
              <div className="relative p-4 rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gold-primary to-amber-600" />
                
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {platform === 'ANDROID' ? 'Android' : platform === 'IOS' ? 'iOS Safari' : 'Web Browser'}
                  </span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">
                    Recomendado
                  </span>
                </div>

                {/* Dynamic Instructions */}
                <div className="min-h-[60px] flex flex-col justify-center">
                  {platform === 'ANDROID' && (
                    <div className="space-y-2">
                      {deferredPrompt ? (
                        <p className="text-sm font-medium text-white/90">
                          Tu dispositivo está listo para instalar RiberGO con un solo clic.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-white/90 font-medium">Toca los 3 puntos arriba a la derecha y selecciona:</p>
                          <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5 shadow-inner">
                            <span className="text-[11px] font-bold text-gold-primary">&quot;Añadir a pantalla de inicio&quot;</span>
                            <motion.div animate={{ x: [-2, 2, -2], y: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                              <ArrowUpRight className="w-4 h-4 text-gold-primary" />
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {platform === 'IOS' && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/90 font-medium">Instala RiberGO en tu iPhone o iPad:</p>
                      <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2 text-[11px] text-white/80">
                          <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center shrink-0 font-bold">1</span>
                          <span>Toca <Share2 className="w-3.5 h-3.5 inline mx-1 text-gold-primary" /> Compartir en la barra de abajo</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-white/80">
                          <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center shrink-0 font-bold">2</span>
                          <span>Selecciona <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-gold-primary" /> Agregar a inicio</span>
                        </div>
                      </div>
                      <div className="flex justify-center mt-2">
                        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <ArrowDown className="w-5 h-5 text-gold-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {platform === 'DESKTOP' && (
                    <p className="text-xs text-white/80 font-medium text-center bg-white/5 p-3 rounded-xl border border-white/5">
                      Haz clic en el icono de instalación en la barra de direcciones de tu navegador.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstallClick}
                  className="w-full relative group overflow-hidden rounded-2xl p-[1px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gold-primary via-amber-400 to-yellow-500 opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-gold-primary/0 via-white/20 to-gold-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <div className="relative w-full h-full bg-gradient-to-b from-white/10 to-transparent flex items-center justify-center gap-2 py-3.5 rounded-2xl backdrop-blur-md">
                    <Download className="w-4 h-4 text-background drop-shadow-sm stroke-[2.5]" />
                    <span className="text-[13px] font-black uppercase tracking-wider text-background drop-shadow-sm">
                      INSTALAR APP
                    </span>
                  </div>
                </motion.button>

                <div className="flex items-center justify-center">
                  <label 
                    onClick={() => setDontShowAgain(!dontShowAgain)}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-300 ${
                      dontShowAgain 
                        ? 'bg-gold-primary border-gold-primary' 
                        : 'bg-white/5 border-white/20 group-hover:border-white/40'
                    }`}>
                      <motion.div
                        initial={false}
                        animate={{ scale: dontShowAgain ? 1 : 0, opacity: dontShowAgain ? 1 : 0 }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-background stroke-[3]" />
                      </motion.div>
                    </div>
                    <span className="text-[11px] text-white/50 group-hover:text-white/80 transition-colors">
                      No volver a mostrar en este navegador
                    </span>
                  </label>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
