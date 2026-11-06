'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { User, Bike, ChevronRight, Sparkles, Shield, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';
import { VehicleIcon } from '@/components/ui/VehicleIcon';
import { VehicleType } from '@/services/mockData';

export const RoleSelectionView = () => {
  const { user, updateUserProfile, setRole, setCurrentView } = useAppStore();

  const [showDriverSetup, setShowDriverSetup] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTOTAXI');
  const [motorcycle, setMotorcycle] = useState(user?.motorcycle || 'Honda Wave 110');
  const [errorMsg, setErrorMsg] = useState('');
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

    // Si seleccionó Conductor: si ya tiene moto o tipo registrado, continuar; de lo contrario, mostrar formulario de vehículo
    if (user?.motorcycle && user?.vehicleType) {
      setRole('DRIVER');
      updateUserProfile({ role: 'DRIVER', hasSelectedRole: true });
      if (user?.id) {
        await apiService.updateUserProfileFirestore(user.id, { role: 'DRIVER', hasSelectedRole: true });
      }
      setCurrentView('MAIN_APP');
    } else {
      setShowDriverSetup(true);
    }
  };

  const handleConfirmDriverRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorcycle.trim()) {
      setErrorMsg('Por favor ingresa el nombre o modelo de tu vehículo');
      return;
    }

    setIsSubmitting(true);
    haptics.success();
    audio.passengerTripFinished();

    const updatedData = {
      role: 'DRIVER' as const,
      hasSelectedRole: true,
      motorcycle: motorcycle.trim(),
      vehicleType: vehicleType,
      verified: true,
      walletBalance: user?.walletBalance ?? 0.00,
      freeTripsRemaining: 5, // 5 viajes de bienvenida sin comisión garantizados al nuevo conductor
      hasCompletedDriverTutorial: false,
    };

    updateUserProfile(updatedData);

    if (user?.id) {
      await apiService.updateUserProfileFirestore(user.id, updatedData);
    }

    setRole('DRIVER');
    setIsSubmitting(false);
    setCurrentView('MAIN_APP');
  };

  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col justify-between p-6 sm:p-8 text-white relative">
      <div className="pt-safe flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {!showDriverSetup ? (
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
                    <p className="text-xs text-text-secondary mt-0.5">Genera ingresos en tu mototaxi. ¡Te regalamos tus primeros 5 viajes sin comisión!</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-gold-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            </div>
          </>
        ) : (
          /* REGISTRATION FORM FOR NEW DRIVER */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-surface border border-gold-primary/40 shadow-2xl space-y-4"
          >
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary mx-auto">
                <VehicleIcon type={vehicleType} className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black text-white">Registro de Conductor</h3>
              <p className="text-xs text-text-secondary">
                Elige qué tipo de vehículo conduces en Riberalta y completa sus datos.
              </p>
            </div>

            {/* Banner Regalo 5 Viajes */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-gold-primary/15 to-yellow-500/15 border border-gold-primary/40 text-xs flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-gold-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gold-primary">¡Regalo de Bienvenida Activado!</p>
                <p className="text-[11px] text-text-secondary leading-snug">
                  Recibes <strong className="text-white">5 viajes 100% libres de comisión</strong>. Cobrarás los ingresos íntegros directo a tu bolsillo.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDriverRegistration} className="space-y-3.5">
              {/* Selector de Tipo de Vehículo */}
              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase block mb-1.5">
                  ¿Qué tipo de vehículo conduces?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'MOTOTAXI' as const, label: 'Mototaxi', sub: 'Moto' },
                    { type: 'TAXI_AUTO' as const, label: 'Taxi Auto', sub: 'Auto' },
                    { type: 'MOTOCAR' as const, label: 'Motocar', sub: 'Carga' },
                  ].map((item) => {
                    const isSelected = vehicleType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setVehicleType(item.type);
                          if (item.type === 'MOTOTAXI' && (!motorcycle || motorcycle.includes('Toyota') || motorcycle.includes('Torito') || motorcycle.includes('Kingwong'))) {
                            setMotorcycle('Honda Wave 110');
                          } else if (item.type === 'TAXI_AUTO' && (!motorcycle || motorcycle.includes('Wave') || motorcycle.includes('Torito') || motorcycle.includes('Kingwong'))) {
                            setMotorcycle('Toyota Caldina');
                          } else if (item.type === 'MOTOCAR' && (!motorcycle || motorcycle.includes('Wave') || motorcycle.includes('Toyota') || motorcycle.includes('Caldina'))) {
                            setMotorcycle('Kingwong 200cc');
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                          isSelected
                            ? 'bg-gold-primary text-background font-black border-gold-primary shadow-md shadow-gold-primary/25'
                            : 'bg-surface-2 border-border-custom text-text-secondary hover:text-white font-bold'
                        }`}
                      >
                        <VehicleIcon type={item.type} className={`w-5 h-5 ${isSelected ? 'text-background stroke-[2.5]' : 'text-gold-primary stroke-[2.2]'}`} />
                        <span className="text-[11px] font-extrabold leading-tight">{item.label}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-background/80' : 'text-text-secondary'}`}>{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Marca, Modelo o Color del Vehículo
                </label>
                <input
                  type="text"
                  value={motorcycle}
                  onChange={(e) => setMotorcycle(e.target.value)}
                  placeholder={
                    vehicleType === 'TAXI_AUTO'
                      ? 'Ej. Toyota Caldina Blanca, Corolla'
                      : vehicleType === 'MOTOCAR'
                      ? 'Ej. Kingwong 200cc, Torito Bajaj Azul'
                      : 'Ej. Honda Wave 110 Roja, Suzuki AX100'
                  }
                  className="w-full mt-1 bg-surface-2 border border-border-custom rounded-xl py-2.5 px-3 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary transition"
                  required
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  Así tus pasajeros te reconocerán fácilmente al llegar.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDriverSetup(false)}
                  className="w-1/3 py-3 rounded-xl bg-surface-2 text-xs font-bold text-text-secondary hover:text-white transition"
                >
                  Volver
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-gold-primary/25 transition active:scale-95 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Guardando...' : 'Comenzar a Trabajar'}</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>

      <div className="pb-safe pt-4 text-center">
        <span className="text-xs text-text-secondary">Riberalta, Bolivia • Conectividad local</span>
      </div>
    </div>
  );
};
