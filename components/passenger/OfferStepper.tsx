'use client';

import { Minus, Plus } from 'lucide-react';
import { MAX_RIDE_OFFER, MIN_RIDE_OFFER } from '@/services/apiService';
import { haptics } from '@/utils/haptics';

/** De 1 en 1 mientras es barato; de 5 en 5 cuando el monto ya es alto. */
export const offerStep = (price: number, direction: 1 | -1) => {
  const step = price < 20 || (direction === -1 && price <= 20) ? 1 : 5;
  return step;
};

export const nextOffer = (price: number, direction: 1 | -1) => {
  const next = price + direction * offerStep(price, direction);
  return Math.max(MIN_RIDE_OFFER, Math.min(MAX_RIDE_OFFER, next));
};

interface Props {
  value: number;
  onChange: (price: number) => void;
  /** Botón redondo central con radar mientras se busca conductor */
  radar?: boolean;
  /** Pequeña etiqueta bajo el monto */
  caption?: string;
}

export function OfferStepper({ value, onChange, radar = false, caption = 'Tu oferta' }: Props) {
  const atMin = value <= MIN_RIDE_OFFER;
  const atMax = value >= MAX_RIDE_OFFER;

  const press = (direction: 1 | -1) => {
    const next = nextOffer(value, direction);
    if (next === value) {
      haptics.error();
      return;
    }
    haptics.selection();
    onChange(next);
  };

  const sideBtn =
    'w-14 h-14 rounded-full bg-surface-2 border border-white/10 text-white flex items-center justify-center transition-[transform,opacity] duration-150 active:scale-90 disabled:opacity-30 disabled:active:scale-100';

  return (
    <div className="flex items-center justify-center gap-4" role="group" aria-label="Precio que ofreces por el viaje">
      <button type="button" onClick={() => press(-1)} disabled={atMin} aria-label="Bajar precio" className={sideBtn}>
        <Minus className="w-6 h-6 stroke-[2.6]" />
      </button>

      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
        {radar && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-gold-primary/40 animate-radar" aria-hidden />
            <span
              className="absolute inset-0 rounded-full border-2 border-gold-primary/30 animate-radar"
              style={{ animationDelay: '0.7s' }}
              aria-hidden
            />
          </>
        )}
        <div className="relative w-28 h-28 rounded-full bg-gold-primary text-background flex flex-col items-center justify-center shadow-[0_12px_32px_-8px_rgba(255,198,26,0.65)]">
          <span className="text-xs font-bold leading-none opacity-80">{caption}</span>
          <span
            key={value}
            aria-live="polite"
            className="font-display text-[40px] font-extrabold leading-none mt-1 tabular-nums animate-in zoom-in-90 duration-150"
          >
            {value}
          </span>
          <span className="text-xs font-bold leading-none mt-1 opacity-80">Bs</span>
        </div>
      </div>

      <button type="button" onClick={() => press(1)} disabled={atMax} aria-label="Subir precio" className={sideBtn}>
        <Plus className="w-6 h-6 stroke-[2.6]" />
      </button>
    </div>
  );
}
