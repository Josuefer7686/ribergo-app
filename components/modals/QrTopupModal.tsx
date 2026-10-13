'use client';

import { useState, useRef } from 'react';
import { IosModal } from '@/components/shared/IosModal';
import { useAppStore } from '@/store/useAppStore';
import { QrCode, CheckCircle2, ShieldCheck, Download, Check, Sparkles, RefreshCw, Upload, Image as ImageIcon, X } from 'lucide-react';
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
  const [selectedAmount, setSelectedAmount] = useState<number>(20);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const driverId = user?.id || 'drv-unregistered';
  const currentBalance = typeof user?.walletBalance === 'number' ? user.walletBalance : 0.0;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=RIBERGO-TOPUP-${selectedAmount}BOB-DRIVER-${driverId}&color=05080B`;

  // Download QR image to gallery
  const handleDownloadQr = async () => {
    haptics.selection();
    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ribergo-recarga-${selectedAmount}bob.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      haptics.success();
    } catch (e) {
      console.error('Error al descargar imagen QR:', e);
      // Fallback
      window.open(qrUrl, '_blank');
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  // Handle receipt image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('La imagen es demasiado pesada. Máximo 10MB.');
        return;
      }
      setErrorMsg('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
        haptics.selection();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmTopup = async () => {
    if (!receiptImage) {
      haptics.error();
      setErrorMsg('Por favor sube la fotografía del comprobante de transferencia bancaria.');
      return;
    }

    setErrorMsg('');
    haptics.heavy();
    setIsProcessing(true);

    try {
      const newBalance = currentBalance + selectedAmount;
      const ref = `COMPROBANTE-FOTO-${Date.now().toString().slice(-6)}`;

      // Update in Firestore y registrar en colección wallet_recharges
      if (user?.id) {
        await apiService.topUpDriverWallet(user.id, selectedAmount, currentBalance, ref);
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
        setReceiptImage(null);
        onClose();
      }, 2000);
    } catch (e) {
      console.error('Error procesando recarga QR:', e);
      setIsProcessing(false);
    }
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
              <h3 className="text-xl font-black text-white">¡Comprobante Enviado!</h3>
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
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        haptics.selection();
                        setSelectedAmount(amount);
                      }}
                      className={`py-2.5 px-1 rounded-2xl border text-center font-black text-xs transition active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                        selectedAmount === amount
                          ? 'bg-gold-primary text-background border-gold-primary shadow-lg shadow-gold-primary/25'
                          : 'bg-surface-2 border-border-custom text-white hover:border-gold-primary/40'
                      }`}
                    >
                      <span className="font-extrabold">{amount} Bs</span>
                      <span className="text-[8px] font-bold opacity-80 leading-tight">
                        {amount} viajes
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

                {/* High-Res Bolivia QR */}
                <div className="w-44 h-44 mx-auto p-3 bg-white rounded-2xl shadow-xl border-4 border-gold-primary/60 flex items-center justify-center relative group">
                  <img
                    src={qrUrl}
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
                  Descarga el QR en tu galería y ábrelo desde tu app bancaria (BNB, BCP, Banco Unión, Fie, etc.) para pagar.
                </p>

                {/* DESCARGAR / GUARDAR EN GALERÍA */}
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={downloading}
                  className="w-full py-2.5 rounded-xl bg-gold-primary/15 border border-gold-primary/40 text-xs font-bold text-gold-light hover:bg-gold-primary hover:text-background flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Download className={`w-4 h-4 ${downloading ? 'animate-bounce text-gold-primary' : ''}`} />
                  <span>{downloading ? 'Guardando en galería...' : 'Descargar / Guardar en galería'}</span>
                </button>
              </div>

              {/* SUBIR COMPROBANTE DE PAGO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  2. Subir comprobante de pago
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {receiptImage ? (
                  <div className="relative p-2.5 rounded-2xl bg-surface-2 border border-gold-primary/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-12 h-12 rounded-xl bg-black border border-border-custom overflow-hidden shrink-0">
                        <img
                          src={receiptImage}
                          alt="Comprobante"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left truncate">
                        <p className="text-xs font-bold text-white flex items-center gap-1 truncate">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Comprobante listo</span>
                        </p>
                        <p className="text-[10px] text-text-secondary">Foto seleccionada</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReceiptImage(null)}
                      className="p-1.5 rounded-xl bg-surface hover:bg-rose-500/20 text-text-secondary hover:text-rose-400 transition"
                      title="Quitar comprobante"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-3 rounded-2xl bg-surface-2/80 hover:bg-surface border-2 border-dashed border-gold-primary/40 text-text-secondary hover:text-white flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white">Subir fotografía del comprobante</span>
                    <span className="text-[10px] text-text-secondary">Toca aquí para seleccionar desde tu galería</span>
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* ACTION CONFIRM BUTTON */}
              <button
                onClick={handleConfirmTopup}
                disabled={isProcessing}
                className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Subiendo comprobante...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Enviar Comprobante ({selectedAmount} BOB)</span>
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
