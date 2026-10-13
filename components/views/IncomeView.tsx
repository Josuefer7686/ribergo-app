'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { DollarSign, TrendingUp, Clock, Bike, Calendar, QrCode, HelpCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { RiberGoCard } from '@/components/shared/RiberGoCard';
import { QrTopupModal } from '@/components/modals/QrTopupModal';
import { DriverWalletTutorialModal } from '@/components/modals/DriverWalletTutorialModal';
import { apiService } from '@/services/apiService';
import { haptics } from '@/utils/haptics';

export const IncomeView = () => {
  const { user, tripsHistory, driverState, topUpWallet, setHasCompletedDriverTutorial } = useAppStore();

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);

  // Compute real driver earnings from completed trips in tripsHistory
  const todayTripsList = tripsHistory.filter(t => t.date === 'Hoy' || t.group === 'TODAY');
  const todayIncome = todayTripsList.reduce((sum, t) => sum + (t.price || 0), 0);
  const todayTripsCount = todayTripsList.length;

  const totalIncome = tripsHistory.reduce((sum, t) => sum + (t.price || 0), 0);
  const currentBalance = user?.walletBalance ?? 0.0;

  // Daily breakdown array
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const dailyChart = daysOfWeek.map(day => ({
    day,
    amount: 0,
  }));

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
      <div className="pt-safe max-w-sm mx-auto space-y-5 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Billetera & Ingresos</h2>
            <p className="text-xs text-text-secondary">RiberGO Driver Pass — Riberalta</p>
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
            holderName={user?.name || 'Chofer RiberGO'}
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

        {/* Week / Month Grid */}
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
              <span className="text-[11px] font-semibold uppercase">Este Mes</span>
            </div>
            <p className="text-lg font-extrabold text-white">{totalIncome.toFixed(2)} <span className="text-xs font-normal text-gold-primary">BOB</span></p>
          </div>
        </div>

        {/* EMPTY STATE BANNER IF NO EARNINGS YET */}
        {tripsHistory.length === 0 && (
          <div className="p-5 rounded-3xl bg-surface border border-border-custom text-center space-y-2">
            <DollarSign className="w-8 h-8 text-gold-primary mx-auto opacity-50" />
            <p className="text-xs font-bold text-white">Sin viajes registrados aún</p>
            <p className="text-[11px] text-text-secondary">Ponte en línea y completa tu primer viaje para ver tus ganancias aquí.</p>
          </div>
        )}

        {/* Weekly Chart Bars */}
        <div className="p-5 rounded-3xl bg-surface-2 border border-border-custom space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Desglose Semanal</h3>
          <div className="flex items-end justify-between gap-2 h-24 pt-4 px-1">
            {dailyChart.map((item, idx) => {
              const heightPct = item.amount > 0 ? Math.round((item.amount / 250) * 100) : 4;
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
                  <span className="text-[10px] font-semibold text-text-secondary">{item.day}</span>
                </div>
              );
            })}
          </div>
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

