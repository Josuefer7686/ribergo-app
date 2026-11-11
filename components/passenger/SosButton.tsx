'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Siren, ShieldAlert, Check } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface Props {
  rideId: string;
  position: { lat: number; lng: number } | null;
}

const WARNING_SECONDS = 3;
const vibrate = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch {}
};

/**
 * Botón SOS del viaje. Al tocarlo avisa durante 3 segundos (solo vibración,
 * sin sonido) y se puede cancelar; pasado ese tiempo alerta a la administración.
 */
export function SosButton({ rideId, position }: Props) {
  const [phase, setPhase] = useState<'idle' | 'warning' | 'sending' | 'sent' | 'error'>('idle');
  const [left, setLeft] = useState(WARNING_SECONDS);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    vibrate(0);
  };
  useEffect(() => stop, []);

  const fire = async () => {
    setPhase('sending');
    vibrate([80, 60, 80, 60, 300]);
    const res = await apiService.sendSos(rideId, positionRef.current);
    if (res.ok) {
      setPhase('sent');
    } else {
      setError(res.error || 'No se pudo enviar el SOS.');
      setPhase('error');
    }
  };

  const start = () => {
    stop();
    setLeft(WARNING_SECONDS);
    setPhase('warning');
    vibrate([300, 200, 300, 200, 300]);
    let remaining = WARNING_SECONDS;
    timer.current = setInterval(() => {
      remaining -= 1;
      setLeft(remaining);
      if (remaining <= 0) {
        stop();
        void fire();
      }
    }, 1000);
  };

  const cancel = () => {
    stop();
    setPhase('idle');
  };

  const sent = phase === 'sent';

  return (
    <>
      <button
        type="button"
        onClick={sent ? undefined : start}
        disabled={sent}
        aria-label="SOS: pedir auxilio"
        className={`w-full min-h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border transition active:scale-[0.98] ${
          sent
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-600 border-rose-400/60 text-white shadow-[0_8px_22px_-8px_rgba(244,63,94,0.7)]'
        }`}
      >
        {sent ? <Check className="w-5 h-5 stroke-[3]" /> : <Siren className="w-5 h-5" />}
        <span>{sent ? 'SOS enviado: estamos observando tu viaje' : 'SOS · Pedir auxilio'}</span>
      </button>

      {phase === 'error' && (
        <p role="alert" className="text-center text-xs text-rose-300">
          {error} <button type="button" onClick={start} className="underline font-bold">Reintentar</button>
        </p>
      )}

      <AnimatePresence>
        {(phase === 'warning' || phase === 'sending') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="Aviso de SOS"
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl bg-surface border border-rose-500/50 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="font-display text-xl font-extrabold text-white">Vas a activar un SOS</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Se activará la observación del conductor y enviaremos ayuda a tu ubicación.
              </p>
              <p className="font-display text-5xl font-extrabold text-rose-400 tabular-nums" aria-live="assertive">
                {phase === 'sending' ? '…' : Math.max(left, 0)}
              </p>
              <button
                type="button"
                onClick={cancel}
                disabled={phase === 'sending'}
                className="w-full min-h-12 rounded-2xl bg-surface-2 border border-white/15 text-white font-bold disabled:opacity-40"
              >
                Cancelar, fue sin querer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
