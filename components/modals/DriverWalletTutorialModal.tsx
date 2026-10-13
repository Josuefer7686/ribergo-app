'use client';

import { useState } from 'react';
import { IosModal } from '@/components/shared/IosModal';
import { useAppStore } from '@/store/useAppStore';
import { Gift, DollarSign, Zap, QrCode, ChevronRight, ChevronLeft, Check, Sparkles, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';

interface DriverWalletTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: Gift,
    title: '¡5 Viajes de Regalo Sin Comisión!',
    subtitle: 'Bono Especial de Primer Inicio de Sesión',
    description: 'Para que arranques a ganar con todo, tus primeros 5 viajes son 100% libres de comisión. ¡Te llevas los 10 Bs íntegros crudos a tu bolsillo sin descuento alguno!',
    highlight: '¡5 carreras totalmente gratis para ti!',
    color: 'from-amber-500/20 to-gold-primary/10',
  },
  {
    step: 2,
    icon: DollarSign,
    title: 'Pasaje a 10 Bs — Directo a Ti',
    subtitle: 'El Pasajero te Paga en Mano o por QR',
    description: 'La tarifa urbana base es de 10 Bs (o más si el cliente oferta un plus para que lo atiendan más rápido). El cliente te pagará en Efectivo o escaneando tu QR.',
    highlight: 'Recibes el 100% de la plata en persona en el momento.',
    color: 'from-emerald-500/20 to-gold-primary/10',
  },
  {
    step: 3,
    icon: Zap,
    title: 'Comisión Justa: Solo 1 Bs',
    subtitle: 'Tú te quedas con 9 Bs Netos',
    description: 'A partir de tu sexto viaje, la app descuenta automáticamente solo 1 Bs de tu saldo de créditos por cada carrera que completes. ¡Sin mensualidades ni cobradores!',
    highlight: '1 viaje = 1 Bs de comisión. ¡Tú ganas 9 Bs!',
    color: 'from-blue-500/20 to-gold-primary/10',
  },
  {
    step: 4,
    icon: QrCode,
    title: 'Recarga Fácil: 10 Bs = 10 Viajes',
    subtitle: 'Recargas Inmediatas por Simple QR',
    description: 'Cuando se acabe tu saldo, puedes recargar 10 Bs (10 viajes), 20 Bs (20 viajes), 50 Bs (50 viajes) escaneando el QR oficial desde tu Banco Unión, BNB, BCP, Fie o Yape.',
    highlight: '¡Se acredita en segundos y sigues trabajando!',
    color: 'from-purple-500/20 to-gold-primary/10',
  },
];

export const DriverWalletTutorialModal = ({ isOpen, onClose }: DriverWalletTutorialModalProps) => {
  const { user, loginUser } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);

  const activeStep = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    haptics.impact();
    audio.keyTick();
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    haptics.selection();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    haptics.success();
    audio.passengerDriverFound();

    // Update in Firestore
    if (user?.id) {
      await apiService.setDriverTutorialCompleted(user.id);
    }

    // Update local store
    if (user) {
      loginUser({
        ...user,
        hasCompletedDriverTutorial: true,
      });
    }

    onClose();
  };

  return (
    <IosModal isOpen={isOpen} onClose={onClose} title="¿Cómo funciona tu Billetera RiberGO?">
      <div className="space-y-4 text-white overflow-hidden">
        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                haptics.selection();
                setCurrentStep(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep === idx
                  ? 'w-7 bg-gold-primary shadow-sm shadow-gold-primary/50'
                  : 'w-2 bg-surface-2 border border-border-custom hover:bg-gold-primary/40'
              }`}
            />
          ))}
        </div>

        {/* Carousel Slide Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`p-5 rounded-3xl bg-gradient-to-b ${activeStep.color} border border-gold-primary/30 space-y-4 text-center relative overflow-hidden`}
          >
            {/* Step Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-surface/90 border-2 border-gold-primary/50 flex items-center justify-center text-gold-primary mx-auto shadow-xl backdrop-blur-md">
              <activeStep.icon className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black text-gold-primary uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-gold-primary/10 border border-gold-primary/30">
                Paso {activeStep.step} de 4
              </span>
              <h3 className="text-lg font-black text-white pt-1">{activeStep.title}</h3>
              <p className="text-xs font-bold text-gold-light">{activeStep.subtitle}</p>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed px-1">
              {activeStep.description}
            </p>

            <div className="p-3 rounded-2xl bg-surface/80 border border-gold-primary/30 backdrop-blur-md text-xs font-bold text-gold-primary shadow-md">
              {activeStep.highlight}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {currentStep > 0 ? (
            <button
              onClick={handlePrev}
              className="py-3 px-4 bg-surface-2 hover:bg-surface border border-border-custom text-text-secondary hover:text-white rounded-2xl font-bold text-xs flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl shadow-gold-primary/25 transition active:scale-95"
          >
            <span>{currentStep === TUTORIAL_STEPS.length - 1 ? '¡Entendido, Empezar!' : 'Siguiente'}</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </IosModal>
  );
};
