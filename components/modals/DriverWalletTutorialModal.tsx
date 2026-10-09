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
    title: '¡Te regalamos 50 BOB de Saldo!',
    subtitle: 'Bono de Bienvenida para Choferes en Riberalta',
    description: 'Para que empieces a ganar de inmediato sin poner un solo centavo, te acreditamos 50 BOB de saldo en tu Billetera RiberGO.',
    highlight: '¡Equivale a tus primeros 50 viajes totalmente libres!',
    color: 'from-amber-500/20 to-gold-primary/10',
  },
  {
    step: 2,
    icon: DollarSign,
    title: 'El Pasajero te paga 100% a Ti',
    subtitle: 'Dinero Directo en tu Bolsillo',
    description: 'El cliente te pagará la tarifa completa (ejemplo: 7 u 8 Bs) en Efectivo o a tu QR personal al finalizar el viaje.',
    highlight: 'Tú te quedas con todo el efectivo en el acto.',
    color: 'from-emerald-500/20 to-gold-primary/10',
  },
  {
    step: 3,
    icon: Zap,
    title: 'Comisión Justa por Carrera',
    subtitle: 'Descuento Automático de 1 BOB',
    description: 'Cada vez que completas un viaje, la app descuenta automáticamente solo 1 BOB de tu saldo RiberGO.',
    highlight: 'Sin mensualidades obligatorias ni cobranzas en persona.',
    color: 'from-blue-500/20 to-gold-primary/10',
  },
  {
    step: 4,
    icon: QrCode,
    title: 'Recargas por QR en 5 Segundos',
    subtitle: 'Cuando tu saldo se agote',
    description: 'Podrás recargar 20, 50 o 100 BOB escaneando un QR oficial desde tu app de Banco Móvil (BNB, BCP, Banco Unión, Fie) sin ir a oficinas.',
    highlight: '¡Tu saldo se acredita de forma instantánea 24/7!',
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
