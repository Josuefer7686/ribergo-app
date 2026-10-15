'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PwaInstallBanner = () => {
  const { deferredPwaPrompt, setDeferredPwaPrompt } = useAppStore();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [setDeferredPwaPrompt]);

  const handleInstallClick = () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt();
      deferredPwaPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted PWA prompt');
        }
        setDeferredPwaPrompt(null);
      });
    } else {
      alert('Para instalar RiberGO en iOS: abre el menú del navegador y selecciona "Agregar a la pantalla de inicio".');
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="p-4 rounded-2xl bg-surface border border-gold-primary/40 shadow-xl flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/40 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-md">
            <img src="/logo.png" alt="RiberGO Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h4 className="font-bold text-white">Instala RiberGO</h4>
            <p className="text-text-secondary text-[11px]">Ten tus mototaxis siempre a un toque</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-gold-primary text-background font-bold text-xs hover:bg-gold-light transition shadow-md"
          >
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-text-secondary hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
