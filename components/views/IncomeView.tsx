'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  DollarSign, TrendingUp, Clock, Bike, Calendar, QrCode, 
  HelpCircle, AlertCircle, Star, MessageSquare, MapPin, Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RiberGoCard } from '@/components/shared/RiberGoCard';
import { QrTopupModal } from '@/components/modals/QrTopupModal';
import { DriverWalletTutorialModal } from '@/components/modals/DriverWalletTutorialModal';
import { apiService, DriverBox } from '@/services/apiService';
import { haptics } from '@/utils/haptics';

export const IncomeView = () => {
  const { user, driverState, topUpWallet, setHasCompletedDriverTutorial } = useAppStore();

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [driverBox, setDriverBox] = useState<DriverBox | null>(null);
  const [loading, setLoading] = useState(true);

  // ID único permanente del conductor para su casillero exclusivo
  const driverId = user?.id || (user?.phone ? 'drv-' + user.phone.replace(/[^0-9]/g, '') : 'drv-ribergo');
  const currentBalance = user?.walletBalance ?? 0.0;

  // Suscripción reactiva en tiempo real al casillero único del conductor
  useEffect(() => {
    if (!driverId) return;
    const unsubscribe = apiService.subscribeToDriverBox(driverId, (box) => {
      setDriverBox(box);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [driverId]);

  // Cálculos reactivos de ingresos del casillero
  const trips = useMemo(() => driverBox?.trips || [], [driverBox]);
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTrips = useMemo(() => {
    return trips.filter(t => t.isoDate === todayStr || t.date === 'Hoy');
  }, [trips, todayStr]);

  const todayIncome = useMemo(() => {
    return todayTrips.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  }, [todayTrips]);

  const totalIncome = useMemo(() => {
    return trips.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  }, [trips]);

  const todayTripsCount = todayTrips.length;
  const totalTripsCount = trips.length;

  // Calificación del conductor
  const ratingsCount = driverBox?.ratingsCount ?? 0;
  const averageRating = driverBox?.rating ?? null;

  // Desglose semanal dinámico basado en los viajes reales
  const dailyChart = useMemo(() => {
    const days = [
      { key: 1, label: 'Lun', amount: 0 },
      { key: 2, label: 'Mar', amount: 0 },
      { key: 3, label: 'Mié', amount: 0 },
      { key: 4, label: 'Jue', amount: 0 },
      { key: 5, label: 'Vie', amount: 0 },
      { key: 6, label: 'Sáb', amount: 0 },
      { key: 0, label: 'Dom', amount: 0 },
    ];

    const now = new Date();
    // Últimos 7 días
    trips.forEach(t => {
      const tripDate = t.completedAtMs ? new Date(t.completedAtMs) : new Date();
      const diffDays = (now.getTime() - tripDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7) {
        const dayIdx = tripDate.getDay();
        const found = days.find(d => d.key === dayIdx);
        if (found) {
          found.amount += Number(t.price) || 0;
        }
      }
    });

    return days;
  }, [trips]);

  const maxDayAmount = Math.max(...dailyChart.map(d => d.amount), 50);

  const handleTopupSuccess = async (amount: number) => {
    topUpWallet(amount);
    if (user?.id) {
      await apiService.topUpDriverWallet(user.id, amount, currentBalance);
    }
  };

  const handleCloseTutorial = async () => {
    setIsTutorialModalOpen(false);
    setHasCompletedDriverTutorial(true);
    if (user?.id) {
      await apiService.setDriverTutorialCompleted(user.id);
    }
  };

  return (
    <div className="w-full h-full bg-background p-4 sm:p-6 text-white overflow-y-auto no-scrollbar">
      <div className="pt-safe max-w-sm mx-auto space-y-5 pb-16">
        {/* Header con ID de Casillero Conductor */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">Billetera & Ingresos</h2>
              <span className="px-2 py-0.5 rounded-full bg-gold-primary/20 border border-gold-primary/40 text-gold-primary text-[10px] font-black uppercase tracking-wider">
                Casillero
              </span>
            </div>
            <p className="text-xs text-text-secondary truncate max-w-[230px]">
              ID: <span className="font-mono text-white/90">{driverId}</span>
            </p>
          </div>
          <button
            onClick={() => {
              haptics.impact();
              setIsTutorialModalOpen(true);
            }}
            className="p-2 rounded-2xl bg-surface-2 border border-gold-primary/30 text-gold-primary hover:bg-gold-primary/10 transition flex items-center gap-1 text-xs font-bold"
            title="Ver Tutorial de Billetera"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>
        </div>

        {/* METALLIC RIBERGO DIGITAL CREDIT CARD */}
        <div className="space-y-3">
          <RiberGoCard
            holderName={user?.name || driverBox?.driverName || 'Chofer RiberGO'}
            balance={currentBalance}
            accountNumber={user?.accountNumber || 'RBT-4820-9182'}
            onTopupClick={() => setIsQrModalOpen(true)}
          />

          {/* Low balance alert banner */}
          {currentBalance <= 0 && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Saldo insuficiente (0.00 BOB)</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">Recarga saldo mediante QR Bolivia para poder ponerte en línea y recibir viajes.</p>
              </div>
            </motion.div>
          )}

          {/* Quick Action Topup Button */}
          <button
            onClick={() => {
              haptics.impact();
              setIsQrModalOpen(true);
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-gold-primary via-amber-400 to-yellow-500 text-background rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/20 transition active:scale-95 hover:brightness-110"
          >
            <QrCode className="w-4 h-4" />
            <span>Recargar Saldo (QR Bolivia Instantáneo)</span>
          </button>
        </div>

        {/* Main Today Earnings Card */}
        <div className="p-5 rounded-3xl bg-surface border border-gold-primary/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Ganancias de Hoy</p>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-black text-gold-primary">{todayIncome.toFixed(2)}</span>
            <span className="text-xs font-bold text-gold-light">BOB (100% en efectivo)</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-custom text-xs">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-gold-primary" />
              <div>
                <p className="text-[10px] text-text-secondary uppercase">Viajes hoy</p>
                <p className="font-bold text-white">{todayTripsCount} viajes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-primary" />
              <div>
                <p className="text-[10px] text-text-secondary uppercase">Estado actual</p>
                <p className="font-bold text-gold-primary">{driverState === 'OFFLINE' ? 'Fuera de línea' : 'En línea'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta de Calificación Real del Conductor */}
        <div className="p-4 rounded-3xl bg-surface-2 border border-border-custom flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary shrink-0 shadow-inner">
              <Award className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Tu Calificación</p>
              {ratingsCount > 0 && averageRating !== null ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-4 h-4 fill-gold-primary text-gold-primary" />
                  <span className="text-base font-black text-white">{averageRating.toFixed(1)}</span>
                  <span className="text-xs text-text-secondary">({ratingsCount} opiniones)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                    Nuevo ✨
                  </span>
                  <span className="text-[11px] text-text-secondary">Sin calificaciones aún</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-text-secondary font-semibold">Total Viajes</p>
            <p className="text-lg font-black text-white">{totalTripsCount}</p>
          </div>
        </div>

        {/* Totales Acumulados */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <Calendar className="w-3.5 h-3.5 text-gold-primary" />
              <span className="text-[11px] font-semibold uppercase">Esta Semana</span>
            </div>
            <p className="text-lg font-extrabold text-white">{totalIncome.toFixed(2)} <span className="text-xs font-normal text-gold-primary">BOB</span></p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-gold-primary" />
              <span className="text-[11px] font-semibold uppercase">Total Histórico</span>
            </div>
            <p className="text-lg font-extrabold text-white">{totalIncome.toFixed(2)} <span className="text-xs font-normal text-gold-primary">BOB</span></p>
          </div>
        </div>

        {/* Desglose Semanal Gráfico */}
        <div className="p-5 rounded-3xl bg-surface-2 border border-border-custom space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Desglose Semanal</h3>
          <div className="flex items-end justify-between gap-2 h-24 pt-4 px-1">
            {dailyChart.map((item, idx) => {
              const heightPct = item.amount > 0 ? Math.min(100, Math.max(15, Math.round((item.amount / maxDayAmount) * 100))) : 6;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-surface rounded-t-lg relative flex items-end justify-center overflow-hidden h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 }}
                      className={`w-full rounded-t-lg ${item.amount > 0 ? 'bg-gold-primary' : 'bg-surface-2 border-t border-border-custom'}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* HISTORIAL DE VIAJES EXCLUSIVO DE ESTE CASILLERO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-gold-primary" />
              <span>Viajes Registrados en tu Casillero</span>
            </h3>
            <span className="text-[11px] text-text-secondary font-mono">{trips.length} viajes</span>
          </div>

          {trips.length === 0 ? (
            <div className="p-6 rounded-3xl bg-surface border border-border-custom text-center space-y-2">
              <DollarSign className="w-8 h-8 text-gold-primary mx-auto opacity-50" />
              <p className="text-xs font-bold text-white">Sin viajes en tu casillero aún</p>
              <p className="text-[11px] text-text-secondary">
                Ponte en línea en el mapa, completa viajes con pasajeros y aquí se registrará cada carrera junto con tu ganancia y calificación.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {trips.map((trip) => (
                <div 
                  key={trip.id}
                  className="p-3.5 rounded-2xl bg-surface border border-border-custom hover:border-gold-primary/40 transition space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-white">{trip.passengerName || 'Pasajero RiberGO'}</p>
                      <p className="text-[10px] text-text-secondary">{trip.date} • {trip.time}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                      +{Number(trip.price).toFixed(2)} BOB
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-300 space-y-0.5 border-t border-border-custom/60 pt-2">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-gold-primary shrink-0" />
                      <span className="truncate">{trip.pickup} ➔ {trip.destination}</span>
                    </p>
                  </div>

                  {/* Calificación y comentario del pasajero si existe */}
                  {trip.rating ? (
                    <div className="pt-1.5 border-t border-border-custom/40 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-gold-primary">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-3 h-3 ${star <= (trip.rating || 0) ? 'fill-gold-primary' : 'text-neutral-600'}`} 
                          />
                        ))}
                      </div>
                      {trip.comment && (
                        <p className="text-[10px] text-text-secondary italic truncate max-w-[170px]">
                          &quot;{trip.comment}&quot;
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 text-[10px] text-text-secondary/70 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Esperando calificación del pasajero</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <QrTopupModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSuccess={handleTopupSuccess}
      />

      <DriverWalletTutorialModal
        isOpen={isTutorialModalOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
};
