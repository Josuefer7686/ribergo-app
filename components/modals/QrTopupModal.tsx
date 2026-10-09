'use client';

import { useState } from 'react';
import { IosModal } from '@/components/shared/IosModal';
import { useAppStore } from '@/store/useAppStore';
import { QrCode, CheckCircle2, ShieldCheck, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';

interface QrTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

export const QrTopupModal = ({ isOpen, onClose, onSuccess }: QrTopupModalProps) => {
  const { user, loginUser, topUpWallet } = useAppStore();
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const driverId = user?.id || 'drv-demo';
  const currentBalance = user?.walletBalance !== undefined ? user.walletBalance : 50;

  const handleConfirmTopup = async () => {
    haptics.heavy();
    setIsProcessing(true);

    try {
      const newBalance = currentBalance + selectedAmount;

      // Update in Firestore
      if (user?.id) {
        await apiService.topUpDriverWallet(user.id, selectedAmount, currentBalance);
      }

      // Update local state store
      if (user) {
        loginUser({
          ...user,
          walletBalance: newBalance,
        });
      } else {
        topUpWallet(selectedAmount);
      }

      if (onSuccess) {
        onSuccess(selectedAmount);
      }

      setIsProcessing(false);
      setIsSuccess(true);
      haptics.success();
      audio.passengerTripFinished();

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      console.error('Error procesando recarga QR:', e);
      setIsProcessing(false);
    }
  };

  const copyQrCodeString = () => {
    haptics.selection();
    navigator.clipboard.writeText(`00020101021226580014bo.gob.pagofacil0124RIBERGO-${driverId}-TOPUP${selectedAmount}5204599953030685404${selectedAmount}.005802BO5917RIBERGO BOLIVIA6009RIBERALTA6304C8A2`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IosModal isOpen={isOpen} onClose={onClose} title="Recargar Saldo por QR">
      <div className="space-y-4 text-white">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="p-6 text-center space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-gold-primary/20 border-2 border-gold-primary text-gold-primary flex items-center justify-center mx-auto shadow-xl shadow-gold-primary/20 animate-bounce">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black text-white">¡Recarga Exitosa!</h3>
              <p className="text-xs text-text-secondary">
                Se agregaron <span className="text-gold-primary font-bold">+{selectedAmount} BOB</span> a tu billetera RiberGO.
              </p>
              <div className="px-4 py-2 rounded-2xl bg-surface-2 border border-gold-primary/30 inline-block text-xs font-bold text-gold-primary">
                Nuevo Saldo: {(currentBalance + selectedAmount).toFixed(2)} BOB
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" className="space-y-4">
              {/* AMOUNT SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  1. Selecciona el monto a recargar
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[20, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        haptics.selection();
                        setSelectedAmount(amount);
                      }}
                      className={`py-3 rounded-2xl border text-center font-black text-sm transition active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                        selectedAmount === amount
                          ? 'bg-gold-primary text-background border-gold-primary shadow-lg shadow-gold-primary/25'
                          : 'bg-surface-2 border-border-custom text-white hover:border-gold-primary/40'
                      }`}
                    >
                      <span>{amount} BOB</span>
                      <span className="text-[9px] font-bold opacity-80">
                        {amount === 20 ? '20 carreras' : amount === 50 ? '50 carreras' : '100 carreras'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QR CODE BOX */}
              <div className="p-4 rounded-3xl bg-surface-2 border border-gold-primary/30 text-center space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs border-b border-border-custom pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-gold-primary" />
                    PagoSimple / QR Bolivia
                  </span>
                  <span className="text-[10px] font-bold text-gold-primary uppercase">
                    Monto: {selectedAmount} BOB
                  </span>
                </div>

                {/* Simulated High-Res Bolivia QR SVG */}
                <div className="w-44 h-44 mx-auto p-3 bg-white rounded-2xl shadow-xl border-4 border-gold-primary/60 flex items-center justify-center relative group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=RIBERGO-TOPUP-${selectedAmount}BOB-DRIVER-${driverId}&color=05080B`}
                    alt="QR Bolivia RiberGO"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl">
                    <span className="text-[10px] font-bold text-gold-primary uppercase tracking-widest">
                      QR Oficial RiberGO
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-text-secondary leading-tight px-2">
                  Abre la app de tu Banco Móvil (BNB, BCP, Banco Unión, Fie, etc.), escanea este QR y confirma.
                </p>

                <button
                  onClick={copyQrCodeString}
                  className="w-full py-2 rounded-xl bg-surface border border-border-custom text-[11px] font-semibold text-gold-light hover:text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-gold-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Código Copiado!' : 'Copiar Código de Pago QR'}</span>
                </button>
              </div>

              {/* ACTION CONFIRM BUTTON */}
              <button
                onClick={handleConfirmTopup}
                disabled={isProcessing}
                className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Acreditando Saldo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar Recarga de {selectedAmount} BOB</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IosModal>
  );
};
