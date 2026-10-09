'use client';

import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { QrCode, Wifi, ShieldCheck, Sparkles, PlusCircle } from 'lucide-react';
import { haptics } from '@/utils/haptics';

interface RiberGoCardProps {
  holderName?: string;
  balance?: number;
  accountNumber?: string;
  onTopupClick?: () => void;
  onOpenTopup?: () => void;
}

export const RiberGoCard = ({ 
  holderName, 
  balance: propBalance, 
  accountNumber: propAccountNumber, 
  onTopupClick, 
  onOpenTopup 
}: RiberGoCardProps) => {
  const { user } = useAppStore();

  const handleTopup = onTopupClick || onOpenTopup || (() => {});

  const balance = propBalance !== undefined ? propBalance : (user?.walletBalance !== undefined ? user.walletBalance : 50.00);
  const cardName = holderName ? holderName.toUpperCase() : (user?.name ? user.name.toUpperCase() : 'MOTOTAXISTA RIBERALTA');
  const accountNumber = propAccountNumber || user?.accountNumber || 'RBT-4820-9182';

  return (
    <div className="w-full relative group perspective-1000">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full rounded-3xl p-5.5 sm:p-6 bg-gradient-to-br from-[#241E09] via-[#0E0A02] to-[#05080B] border-2 border-gold-primary/50 shadow-[0_15px_40px_rgba(244,197,66,0.18)] relative overflow-hidden text-white flex flex-col justify-between gap-5 transition-all duration-300 group-hover:border-gold-primary group-hover:shadow-[0_20px_50px_rgba(244,197,66,0.28)]"
      >
        {/* Metallic Gold Shimmer Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gold-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* CARD TOP BAR */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight flex items-center gap-1">
              <span className="text-white">Riber</span>
              <span className="text-gold-primary">GO</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gold-primary/20 text-[9px] font-black text-gold-primary uppercase tracking-widest border border-gold-primary/30">
              Chofer Pass
            </span>
          </div>

          <div className="flex items-center gap-2 text-gold-primary/80">
            <Wifi className="w-5 h-5 rotate-90" />
            <ShieldCheck className="w-4 h-4 text-gold-primary" />
          </div>
        </div>

        {/* CHIP EMV & ACCOUNT NO */}
        <div className="flex items-center justify-between z-10 pt-1">
          {/* Metallic Gold Chip */}
          <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-[#D4AF37] via-[#F4C542] to-[#FFE885] border border-gold-primary/60 shadow-md relative overflow-hidden flex items-center justify-center">
            <div className="w-full h-[1px] bg-background/30 absolute top-2" />
            <div className="w-full h-[1px] bg-background/30 absolute bottom-2" />
            <div className="h-full w-[1px] bg-background/30 absolute left-3" />
            <div className="h-full w-[1px] bg-background/30 absolute right-3" />
          </div>

          <span className="font-mono text-xs font-bold tracking-widest text-gold-light/90">
            {accountNumber}
          </span>
        </div>

        {/* BALANCE DISPLAY & TOPUP ACTION */}
        <div className="flex items-end justify-between z-10 pt-2 border-t border-gold-primary/20">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Saldo de Comisión</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-gold-primary tracking-tight">
                {balance.toFixed(2)}
              </span>
              <span className="text-xs font-extrabold text-gold-light">BOB</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptics.impact();
              handleTopup();
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-gold-primary hover:bg-gold-light text-background font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-gold-primary/25 transition active:scale-95"
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" />
            <span>Recargar QR</span>
          </motion.button>
        </div>

        {/* CARDHOLDER FOOTER */}
        <div className="flex items-center justify-between text-[10px] text-text-secondary z-10">
          <span className="font-bold text-white tracking-wider truncate max-w-[200px]">
            {cardName}
          </span>
          <span className="font-semibold text-gold-primary/80">
            Riberalta • Bolivia
          </span>
        </div>
      </motion.div>
    </div>
  );
};
