'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, MapPin, AlertCircle, ShieldAlert, ChevronDown, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { haptics } from '@/utils/haptics';

interface IosLocationPermissionModalProps {
  isOpen: boolean;
  onRequestPermission: () => void;
  isRequesting?: boolean;
  errorMsg?: string | null;
}

export const IosLocationPermissionModal = ({
  isOpen,
  onRequestPermission,
  isRequesting = false,
  errorMsg = null,
}: IosLocationPermissionModalProps) => {
  const [showIpGuide, setShowIpGuide] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.host : '192.168.1.X:3000';
  const flagText = `http://${currentHost}`;

  const handleCopyFlag = () => {
    haptics.selection();
    navigator.clipboard.writeText(flagText);
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 text-white overflow-y-auto">
      {/* Background Animated Pulse Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-gold-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card Modal */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-sm rounded-3xl bg-surface/95 border-2 border-gold-primary/40 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-center space-y-5"
      >
        {/* Animated Badge Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gold-primary/20 animate-ping opacity-75" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-primary via-amber-400 to-yellow-500 text-background flex items-center justify-center shadow-xl shadow-gold-primary/30 z-10">
            <Navigation className="w-9 h-9 stroke-[2.5] animate-pulse" />
          </div>
        </div>

        {/* Title & Body Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Permiso Obligatorio</span>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">
            Ubicación Requerida
          </h3>

          <p className="text-xs text-text-secondary leading-relaxed px-1">
            RiberGO necesita conocer tu <strong className="text-white">ubicación GPS exacta</strong> para mostrarte en el mapa y conectarte con el mototaxi más cercano en Riberalta. Sin tu ubicación, la aplicación no puede funcionar.
          </p>
        </div>

        {/* Error Notification Banner if Permission Denied or HTTP Blocked */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-left text-xs text-rose-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Acceso no concedido aún</span>
            </div>
            <p className="text-[11px] text-rose-200/80 leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Action Button: Allow Location */}
        <div className="space-y-3 pt-1">
          <button
            onClick={() => {
              haptics.heavy();
              onRequestPermission();
            }}
            disabled={isRequesting}
            className="w-full py-4 px-5 bg-gradient-to-r from-gold-primary via-amber-400 to-yellow-500 text-background rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-gold-primary/30 transition active:scale-95 disabled:opacity-50 hover:brightness-110"
          >
            {isRequesting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Obteniendo GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5 stroke-[2.5]" />
                <span>PERMITIR UBICACIÓN</span>
              </>
            )}
          </button>

          {/* Accordion Toggle for Chrome IP Access Guide */}
          <div className="border-t border-border-custom pt-3">
            <button
              onClick={() => {
                haptics.selection();
                setShowIpGuide(!showIpGuide);
              }}
              className="w-full text-[11px] font-bold text-gold-light hover:text-white flex items-center justify-center gap-1 transition"
            >
              <span>¿Entrando por IP local desde tu celular?</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIpGuide ? 'rotate-180' : ''}`} />
            </button>

            {showIpGuide && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 p-3.5 rounded-2xl bg-surface-2 border border-border-custom text-left text-[11px] space-y-2 text-text-secondary"
              >
                <p className="font-bold text-white text-xs">Pasos en Chrome para Android/iOS (IP local):</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>En tu celular abre Chrome y entra a: <code className="text-gold-primary font-mono bg-background px-1 py-0.5 rounded">chrome://flags</code></li>
                  <li>Busca la opción: <strong className="text-white">Insecure origins treated as secure</strong></li>
                  <li>Añade la URL completa de tu servidor:</li>
                </ol>

                <div className="flex items-center justify-between p-2 rounded-xl bg-background border border-gold-primary/40 font-mono text-[10px] text-gold-primary">
                  <span className="truncate">{flagText}</span>
                  <button
                    onClick={handleCopyFlag}
                    className="ml-2 p-1 rounded-lg bg-surface border border-border-custom text-white hover:text-gold-primary flex items-center gap-1"
                  >
                    {copiedFlag ? <Check className="w-3 h-3 text-gold-primary" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFlag ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <p className="text-[10px] text-text-secondary italic">
                  Cambia el estado a <strong>Enabled</strong> y dale en <strong>Relaunch / Reiniciar Chrome</strong>. ¡Listo! El GPS funcionará directo.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
