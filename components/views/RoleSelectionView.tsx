'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { User, Bike, ChevronRight, Sparkles, Shield, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';
import { VehicleIcon } from '@/components/ui/VehicleIcon';
import { VehicleType } from '@/services/mockData';

export const RoleSelectionView = () => {
  const { user, updateUserProfile, setRole, setCurrentView } = useAppStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si el usuario ya cuenta con rol seleccionado permanentemente, redirigir directo a MAIN_APP
  useEffect(() => {
    if (user?.hasSelectedRole) {
      setCurrentView('MAIN_APP');
    }
  }, [user, setCurrentView]);

  const handleSelectRole = async (selectedRole: 'PASSENGER' | 'DRIVER') => {
    haptics.heavy();

    if (selectedRole === 'PASSENGER') {
      setRole('PASSENGER');
      updateUserProfile({ role: 'PASSENGER', hasSelectedRole: true });
      if (user?.id) {
        await apiService.updateUserProfileFirestore(user.id, { role: 'PASSENGER', hasSelectedRole: true });
      }
      setCurrentView('MAIN_APP');
      return;
    }

    // Conductor: se elige el rol y la verificación (identidad + vehículos) arranca al entrar.
    if (isSubmitting) return;
    setIsSubmitting(true);
    audio.passengerTripFinished();
    const driverData = {
      role: 'DRIVER' as const,
      hasSelectedRole: true,
      walletBalance: user?.walletBalance ?? 0,
      freeTripsRemaining: 5, // 5 viajes de bienvenida sin comisión
      hasCompletedDriverTutorial: false,
    };
    updateUserProfile(driverData);
    setRole('DRIVER');
    if (user?.id) await apiService.updateUserProfileFirestore(user.id, driverData);
    setIsSubmitting(false);
    setCurrentView('MAIN_APP');
  };

  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col justify-between p-6 sm:p-8 text-white relative">
      <div className="pt-safe flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {(
          <>
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center mb-3">
                <div className="absolute inset-0 rounded-2xl bg-gold-primary/25 blur-lg" />
                <img
                  src="/logo.png"
                  alt="RiberGO Logo"
                  className="w-16 h-16 object-contain rounded-2xl shadow-xl shadow-gold-primary/10 relative z-10 border border-gold-primary/30"
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                ¿Cómo quieres usar <span className="text-white">Riber</span><span className="text-gold-primary">GO</span>?
              </h2>
              <p className="text-xs text-text-secondary">
                Selecciona el tipo de cuenta para este registro. Por seguridad, la cuenta queda vinculada permanentemente a este rol.
              </p>
            </div>

            <div className="space-y-4">
              {/* Passenger Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectRole('PASSENGER')}
                className="w-full text-left p-5 rounded-2xl bg-surface border border-gold-primary/30 hover:border-gold-primary transition-all shadow-xl group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary group-hover:bg-gold-primary group-hover:text-background transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white group-hover:text-gold-primary transition-colors">SOY PASAJERO</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Solicita un mototaxi y llega más rápido a cualquier lugar de Riberalta.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-gold-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>

              {/* Driver Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectRole('DRIVER')}
                className="w-full text-left p-5 rounded-2xl bg-surface-2 border border-border-custom hover:border-gold-primary transition-all shadow-xl group relative overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-border-custom flex items-center justify-center text-gold-primary group-hover:bg-gold-primary group-hover:text-background transition-colors">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-gold-primary transition-colors">SOY CONDUCTOR</h3>
                      <span className="px-2 py-0.5 rounded-full bg-gold-primary/20 text-gold-primary text-[10px] font-black uppercase">
                        5 Viajes Gratis
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">Genera ingresos con tu moto, motocar o auto. Primero verificamos tu identidad y tus vehículos. ¡Y te regalamos 5 viajes sin comisión!</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-gold-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            </div>
          </>
        )}
      </div>

      <div className="pb-safe pt-4 text-center">
        <span className="text-xs text-text-secondary">Riberalta, Bolivia • Conectividad local</span>
      </div>
    </div>
  );
};
