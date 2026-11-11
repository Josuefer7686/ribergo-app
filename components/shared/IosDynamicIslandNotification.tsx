'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Sparkles, X, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

export interface DynamicIslandBannerData {
  id: string;
  type: 'WALLET_APPROVED' | 'WALLET_REJECTED' | 'SYSTEM_INFO';
  title: string;
  subtitle: string;
  amount?: number;
  time?: string;
  data?: any;
}

interface IosDynamicIslandNotificationProps {
  banner: DynamicIslandBannerData | null;
  onClose: () => void;
  onAction?: (banner: DynamicIslandBannerData) => void;
}

export const IosDynamicIslandNotification = ({
  banner,
  onClose,
  onAction,
}: IosDynamicIslandNotificationProps) => {
  const lastAlertedId = useRef<string | null>(null);

  // Play sound and haptics when banner pops up
  useEffect(() => {
    if (banner && banner.id && banner.id !== lastAlertedId.current) {
      lastAlertedId.current = banner.id;

      if (banner.type === 'WALLET_APPROVED') {
        audio.walletApprovedChime();
        haptics.walletApprovalSuccess();
      } else if (banner.type === 'WALLET_REJECTED') {
        haptics.error();
      } else {
        audio.messageReceived();
        haptics.notification();
      }
    }
  }, [banner]);

  // Auto-dismiss after 6.5 seconds
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6500);
    return () => clearTimeout(timer);
  }, [banner, onClose]);

  return (
    <AnimatePresence>
      {banner && (
        <div className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[110] w-[94%] max-w-[420px] pointer-events-auto">
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.8, bottom: 0.1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -30) {
                haptics.selection();
                onClose();
              }
            }}
            initial={{ y: -90, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -90, opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', damping: 24, stiffness: 380 }}
            onClick={() => {
              haptics.selection();
              if (onAction) onAction(banner);
              onClose();
            }}
            className={`p-3.5 rounded-3xl backdrop-blur-2xl text-white flex items-center justify-between gap-3.5 cursor-pointer shadow-[0_15px_35px_rgba(0,0,0,0.85)] border transition-all active:scale-[0.98] ${
              banner.type === 'WALLET_APPROVED'
                ? 'bg-surface/95 border-emerald-500/50 shadow-emerald-500/20'
                : banner.type === 'WALLET_REJECTED'
                ? 'bg-surface/95 border-rose-500/50 shadow-rose-500/20'
                : 'bg-surface/95 border-gold-primary/50 shadow-gold-primary/20'
            }`}
          >
            {/* Animated Icon Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${
                  banner.type === 'WALLET_APPROVED'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                    : banner.type === 'WALLET_REJECTED'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-400'
                    : 'bg-gold-primary/20 border-gold-primary text-gold-primary'
                }`}
              >
                {banner.type === 'WALLET_APPROVED' ? (
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                ) : banner.type === 'WALLET_REJECTED' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Wallet className="w-6 h-6" />
                )}
              </div>
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 border-background absolute -bottom-0.5 -right-0.5 animate-ping ${
                  banner.type === 'WALLET_APPROVED'
                    ? 'bg-emerald-400'
                    : banner.type === 'WALLET_REJECTED'
                    ? 'bg-rose-500'
                    : 'bg-gold-primary'
                }`}
              />
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black tracking-tight text-white truncate">
                  {banner.title}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    banner.type === 'WALLET_APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-2 text-text-secondary'
                  }`}
                >
                  {banner.time || 'Ahora'}
                </span>
              </div>
              <p className="text-[11.5px] text-text-secondary truncate mt-0.5 font-medium leading-tight">
                {banner.subtitle}
              </p>
            </div>

            {/* CTA Button & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-0.5 ${
                  banner.type === 'WALLET_APPROVED'
                    ? 'bg-emerald-500 text-background shadow-md shadow-emerald-500/30'
                    : 'bg-gold-primary text-background shadow-md shadow-gold-primary/30'
                }`}
              >
                <span>Ver</span>
                <ChevronRight className="w-3 h-3 stroke-[3]" />
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.selection();
                  onClose();
                }}
                className="p-1 rounded-full text-text-secondary hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
