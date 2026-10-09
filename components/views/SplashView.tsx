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
          {/* Minimalist Mototaxi Icon */}
          <div className="w-20 h-20 rounded-3xl bg-surface-2 border border-gold-primary/30 flex items-center justify-center mb-6 shadow-2xl shadow-gold-primary/10 relative">
            <div className="absolute inset-0 rounded-3xl bg-gold-primary/10 animate-pulse" />
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#F4C542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6h2l3 5v5h-2"/>
              <path d="M5.5 17.5L9 9h5l2.5 5"/>
            </svg>
          </div>

          {/* Logo */}
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className="text-white">Riber</span>
            <span className="text-gold-primary">GO</span>
          </h1>

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-text-secondary text-sm font-medium tracking-wide uppercase"
          >
            Mototaxis a un toque
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
