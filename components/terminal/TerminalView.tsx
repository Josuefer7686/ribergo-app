'use client';

import { useAppStore } from '@/store/useAppStore';
import { Bus, Sparkles, Clock, ArrowLeft, ShieldCheck, Construction } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '@/utils/haptics';

export const TerminalView = () => {
  const { setActiveTransportMode } = useAppStore();

  return (
    <div className="w-full h-full bg-background p-4 sm:p-6 text-white flex flex-col items-center justify-center overflow-y-auto no-scrollbar pb-24">
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        className="max-w-sm w-full mx-auto p-6 rounded-3xl bg-surface-2/95 border border-gold-primary/30 backdrop-blur-xl shadow-2xl text-center space-y-6 relative overflow-hidden"
      >
        {/* Decorative Golden Glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-gold-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-gold-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon Header */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-gold-primary/20 via-surface-3 to-gold-primary/10 border border-gold-primary/40 flex items-center justify-center text-gold-primary shadow-xl shadow-gold-primary/10">
            <Bus className="w-10 h-10" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gold-primary text-background flex items-center justify-center font-black text-xs shadow-lg animate-pulse">
            <Sparkles className="w-4 h-4 fill-background" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/30 text-gold-primary text-[10px] font-black uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5" />
            <span>Próximamente en RiberGO</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Terminal Interprovincial <br />
            <span className="text-gold-primary">(Riberalta ⇄ Guayaramerín)</span>
          </h2>
        </div>

        {/* Message Description */}
        <div className="p-4 rounded-2xl bg-surface/60 border border-border-custom/50 text-xs text-text-secondary leading-relaxed space-y-2.5 text-left">
          <p className="flex items-start gap-2.5 text-white/90 font-medium">
            <Construction className="w-4 h-4 text-gold-primary shrink-0 mt-0.5" />
            <span>Estamos trabajando en grandes mejoras para brindarte el servicio de transporte interprovincial más rápido, cómodo y seguro de la región.</span>
          </p>
          <p className="text-text-secondary text-[11px] pt-2 border-t border-border-custom/30">
            Muy pronto podrás reservar pasajes en Autos Noah/Ipsum, contratar Expresos y realizar envíos de Encomiendas en tiempo real desde RiberGO.
          </p>
        </div>

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-3.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>¡Gracias por tu paciencia y por confiar en RiberGO!</span>
        </div>

        {/* Action Button: Volver a Mototaxi Urbana */}
        <button
          onClick={() => {
            haptics.selection();
            setActiveTransportMode('URBAN_MOTOTAXI');
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-gold-primary via-gold-hover to-gold-primary text-background font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-gold-primary/25 hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Pedir Mototaxi Urbana</span>
        </button>

      </motion.div>
    </div>
  );
};
