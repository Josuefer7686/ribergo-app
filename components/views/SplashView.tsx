'use client';

import { motion } from 'framer-motion';

export const SplashView = () => {
  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col items-center justify-between p-8 relative overflow-hidden select-none">
      {/* Background ambient gold glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gold-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-gold-primary/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Official RiberGO Logo with Ambient Aura Glow */}
          <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gold-primary/30 blur-2xl animate-pulse" />
            <img
              src="/logo.png"
              alt="RiberGO Logo Oficial"
              className="w-36 h-36 object-contain rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.85)] relative z-10"
            />
          </div>

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-text-secondary text-xs font-bold tracking-[0.2em] uppercase"
          >
            Tu transporte, más cerca • Riberalta
          </motion.p>
        </motion.div>
      </div>

      {/* Loading Spinner / Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-3 z-10 pb-6"
      >
        <div className="w-6 h-6 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-text-secondary tracking-widest uppercase font-semibold">Riberalta, Bolivia</span>
      </motion.div>
    </div>
  );
};
