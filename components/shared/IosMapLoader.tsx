'use client';

import { motion } from 'framer-motion';
import { MapPin, Navigation, Compass, Sparkles } from 'lucide-react';

export const IosMapLoader = () => {
  return (
    <div className="w-full h-full absolute inset-0 z-20 bg-background/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Animated Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold-primary/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Simulated Map Grid Watermark */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F4C542_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main Glass Box Container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 p-7 sm:p-8 rounded-3xl bg-surface/90 border border-gold-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl max-w-xs w-full text-center space-y-5 flex flex-col items-center justify-center"
      >
        {/* Animated Radar & Location Pin Icon */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Outer Ripple Rings */}
          <div className="absolute inset-0 rounded-full bg-gold-primary/20 animate-ping opacity-75" />
          <div className="absolute -inset-2 rounded-full border border-gold-primary/40 animate-pulse" />

          {/* Golden Glass Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-primary via-amber-400 to-yellow-500 text-background flex items-center justify-center shadow-xl shadow-gold-primary/30 z-10 relative">
            <MapPin className="w-9 h-9 stroke-[2.5] animate-bounce" />
          </div>
        </div>

        {/* Text & iOS Spinner */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-gold-primary">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-widest">RiberGO GPS</span>
          </div>

          <h3 className="text-base font-extrabold text-white tracking-tight">
            Cargando Mapa & GPS
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed px-1">
            Detectando tu ubicación exacta en tiempo real en Riberalta...
          </p>
        </div>

        {/* iOS Glass Progress Ring */}
        <div className="w-full flex items-center justify-center gap-2 pt-2 border-t border-border-custom/60">
          <div className="w-5 h-5 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gold-light">Localizando dispositivo...</span>
        </div>
      </motion.div>
    </div>
  );
};
