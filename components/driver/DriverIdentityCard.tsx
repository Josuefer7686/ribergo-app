'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Star, UserRound } from 'lucide-react';
import { fetchDriverCard, type DriverCard } from '@/services/driverVerificationClient';

/** Datos verificados del conductor del viaje (null mientras carga o si no está verificado). */
export function useDriverCard(rideId?: string | null) {
  const [state, setState] = useState<{ id: string; card: DriverCard | null } | null>(null);
  useEffect(() => {
    if (!rideId) return;
    let alive = true;
    fetchDriverCard(rideId).then((card) => alive && setState({ id: rideId, card }));
    return () => { alive = false; };
  }, [rideId]);
  return state && state.id === rideId ? state.card : null;
}

interface Props {
  card: DriverCard;
  rating?: number | null;
  trips?: number;
  /** Versión corta para el viaje en curso */
  compact?: boolean;
}

export function DriverIdentityCard({ card, rating, trips, compact = false }: Props) {
  const rated = typeof rating === 'number' && rating > 0;
  return (
    <div className="rounded-3xl overflow-hidden bg-surface-2 border border-gold-primary/30">
      {card.vehiclePhoto && (
        <div className={`relative w-full ${compact ? 'aspect-[21/9]' : 'aspect-[16/9]'} bg-surface`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.vehiclePhoto} alt={`Vehículo: ${card.vehicleModel}`} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface-2 to-transparent" />
        </div>
      )}
      <div className={`relative px-4 pb-4 ${card.vehiclePhoto ? '-mt-9' : 'pt-4'} flex items-end gap-3.5`}>
        {card.facePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.facePhoto} alt={`Rostro de ${card.fullName}`} className="w-[72px] h-[72px] shrink-0 rounded-2xl object-cover border-[3px] border-gold-primary shadow-lg" />
        ) : (
          <div className="w-[72px] h-[72px] shrink-0 rounded-2xl bg-surface border-[3px] border-gold-primary flex items-center justify-center text-gold-primary"><UserRound className="w-8 h-8" /></div>
        )}
        <div className="min-w-0 flex-1 pb-0.5 space-y-0.5">
          <p className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300"><BadgeCheck className="w-3.5 h-3.5" />Identidad verificada</p>
          <h4 className="font-display text-lg font-extrabold leading-tight text-white break-words">{card.fullName}</h4>
          <p className="text-sm text-text-secondary leading-snug break-words">{card.vehicleModel}</p>
          {!compact && (
            <p className="flex items-center gap-1 text-xs font-bold text-gold-primary">
              <Star className="w-3.5 h-3.5 fill-gold-primary" />
              {rated ? Number(rating).toFixed(1) : 'Nuevo'}
              {typeof trips === 'number' && <span className="font-medium text-text-secondary"> · {trips} viajes</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
