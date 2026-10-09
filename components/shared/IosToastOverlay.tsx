'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IosSpinner } from './IosSpinner';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

interface IosToastOverlayProps {
  isLoading?: boolean;
  loadingText?: string;
  showSuccess?: boolean;
  successTitle?: string;
  successSubtitle?: string;
  onSuccessComplete?: () => void;
}

export const IosToastOverlay: React.FC<IosToastOverlayProps> = ({
  isLoading = false,
  loadingText = 'Cargando...',
  showSuccess = false,
  successTitle = '¡Éxito!',
  successSubtitle = 'Operación completada con éxito',
  onSuccessComplete,
}) => {
  // Play iOS Success Sound & Haptics when showSuccess becomes true
  useEffect(() => {
    if (showSuccess) {
      haptics.success();
      audio.passengerDriverFound();

      const timer = setTimeout(() => {
        if (onSuccessComplete) onSuccessComplete();
      }, 1400);

      return () => clearTimeout(timer);
    }
  }, [showSuccess, onSuccessComplete]);

  return (
    <AnimatePresence>
      {(isLoading || showSuccess) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl select-none"
        >
          {isLoading && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="w-52 h-52 bg-surface-2/85 border border-white/15 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 shadow-2xl backdrop-blur-2xl text-center"
            >
              <IosSpinner size="lg" color="#F4C542" />
              <p className="text-xs font-semibold text-white/90 tracking-wide px-2 leading-snug">
                {loadingText}
              </p>
            </motion.div>
          )}

          {showSuccess && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="w-56 py-7 px-5 bg-surface-2/90 border border-green-500/30 rounded-3xl flex flex-col items-center justify-center gap-3.5 shadow-2xl shadow-green-500/10 backdrop-blur-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.05 }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20"
              >
                <svg className="w-8 h-8 stroke-emerald-400" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.35, delay: 0.15 }}
                    d="M20 6L9 17l-5-5"
                  />
                </svg>
              </motion.div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white tracking-tight">
                  {successTitle}
                </h4>
                <p className="text-[11px] text-text-secondary font-medium">
                  {successSubtitle}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
