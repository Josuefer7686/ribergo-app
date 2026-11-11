'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { haptics } from '@/utils/haptics';

export function SafetyBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-surface-2 border border-white/10">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          haptics.selection();
          setOpen((v) => !v);
        }}
        className="w-full min-h-16 px-4 flex items-center gap-3 text-left active:opacity-80 transition-opacity"
      >
        <ShieldCheck className="w-8 h-8 text-gold-primary shrink-0 stroke-[1.7]" aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="block text-base font-bold text-white leading-tight">Viaja seguro</span>
          <span className="block text-sm text-text-secondary">Conductores verificados</span>
        </span>
        <ChevronRight
          className={`w-5 h-5 text-gold-primary shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm leading-relaxed text-text-secondary">
              Cada conductor registra su vehículo y su placa antes de recibir viajes. Cuando aceptan tu pedido ves su nombre, placa y calificación antes de subir.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
