'use client';

import { useAppStore } from '@/store/useAppStore';
import { User, Bike, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '@/utils/haptics';

export const RoleSelectionView = () => {
  const { setRole, setCurrentView } = useAppStore();

  const handleSelectRole = (selectedRole: 'PASSENGER' | 'DRIVER') => {
    haptics.heavy();
    setRole(selectedRole);
    setCurrentView('MAIN_APP');
  };

  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col justify-between p-6 sm:p-8 text-white relative">
      <div className="pt-safe flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">¿Cómo quieres usar <span className="text-white">Riber</span><span className="text-gold-primary">GO</span>?</h2>
          <p className="text-xs text-text-secondary">Selecciona tu modo principal. Podrás cambiarlo cuando quieras desde tu perfil.</p>
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
                <h3 className="text-base font-bold text-white group-hover:text-gold-primary transition-colors">SOY CONDUCTOR</h3>
                <p className="text-xs text-text-secondary mt-0.5">Genera ingresos conduciendo tu mototaxi con total libertad.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-gold-primary group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        </div>
      </div>

      <div className="pb-safe pt-4 text-center">
        <span className="text-xs text-text-secondary">Riberalta, Bolivia • Conectividad local</span>
      </div>
    </div>
  );
};
