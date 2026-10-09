'use client';

import { useAppStore } from '@/store/useAppStore';
import { Bike, Calendar, MapPin, Star, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const TripsView = () => {
  const { tripsHistory } = useAppStore();

  return (
    <div className="w-full h-full bg-background p-4 sm:p-6 text-white overflow-y-auto no-scrollbar">
      <div className="pt-safe max-w-sm mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Mis Viajes</h2>
            <p className="text-xs text-text-secondary">Historial de recorridos en Riberalta</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-border-custom flex items-center justify-center text-gold-primary">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Trips List */}
        {tripsHistory.length === 0 ? (
          <div className="p-8 text-center bg-surface rounded-3xl border border-border-custom space-y-3">
            <Bike className="w-10 h-10 text-gold-primary mx-auto opacity-50" />
            <p className="text-sm font-bold text-white">Aún no tienes viajes registrados</p>
            <p className="text-xs text-text-secondary">Pide tu primer mototaxi con RiberGO hoy mismo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tripsHistory.map((trip, idx) => (
              <motion.div
                key={`${trip.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-surface border border-border-custom hover:border-gold-primary/30 space-y-3 transition shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-border-custom/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-gold-primary/10 text-[10px] font-bold text-gold-primary uppercase">
                      {trip.date} • {trip.time}
                    </span>
                  </div>
                  <span className="text-sm font-black text-gold-primary">{trip.price} BOB</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gold-primary" />
                    <span className="text-text-secondary font-medium truncate">{trip.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-gold-primary" />
                    <span className="text-white font-bold truncate">{trip.destination}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-custom/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Bike className="w-3.5 h-3.5 text-gold-primary" />
                    <span>{trip.driverName}</span>
                    <span className="text-[10px]">({trip.motorcycle})</span>
                  </div>
                  <div className="flex items-center gap-1 text-gold-primary text-xs font-bold">
                    <Star className="w-3 h-3 fill-gold-primary" />
                    <span>{trip.driverRating}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
