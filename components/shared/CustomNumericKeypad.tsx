'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Delete, ArrowRight, Check } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

interface CustomNumericKeypadProps {
  onKeyPress: (digit: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  isSubmitDisabled?: boolean;
  submitLabel?: string;
  maxLength?: number;
  currentLength?: number;
}

export const CustomNumericKeypad: React.FC<CustomNumericKeypadProps> = ({
  onKeyPress,
  onDelete,
  onSubmit,
  isSubmitDisabled = false,
  maxLength = 8,
  currentLength = 0,
}) => {
  const handleNumTap = (num: string) => {
    if (currentLength >= maxLength) return;
    haptics.selection();
    audio.keyTick();
    onKeyPress(num);
  };

  const handleDeleteTap = () => {
    haptics.impact();
    audio.keyTick();
    onDelete();
  };

  const handleSubmitTap = () => {
    if (isSubmitDisabled || !onSubmit) return;
    haptics.heavy();
    onSubmit();
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-xs mx-auto space-y-2.5 select-none pt-2">
      {/* 3x3 Grid for 1-9 */}
      <div className="grid grid-cols-3 gap-2.5">
        {keys.map((num) => (
          <motion.button
            key={num}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => handleNumTap(num)}
            className="h-13 py-3 rounded-2xl bg-surface-2/90 hover:bg-surface border border-white/10 text-white font-bold text-xl flex flex-col items-center justify-center shadow-md active:bg-gold-primary/20 transition duration-150 active:border-gold-primary/40"
          >
            <span>{num}</span>
          </motion.button>
        ))}

        {/* Bottom Row: Backspace, 0, Submit Action */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={handleDeleteTap}
          className="h-13 py-3 rounded-2xl bg-surface-2/70 hover:bg-surface border border-white/10 text-text-secondary hover:text-white flex items-center justify-center shadow-md transition active:bg-red-500/20 active:text-red-400"
          aria-label="Borrar"
        >
          <Delete className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => handleNumTap('0')}
          className="h-13 py-3 rounded-2xl bg-surface-2/90 hover:bg-surface border border-white/10 text-white font-bold text-xl flex items-center justify-center shadow-md transition active:bg-gold-primary/20"
        >
          <span>0</span>
        </motion.button>

        {onSubmit ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={handleSubmitTap}
            disabled={isSubmitDisabled}
            className={`h-13 py-3 rounded-2xl font-bold flex items-center justify-center shadow-lg transition duration-200 ${
              isSubmitDisabled
                ? 'bg-surface border border-white/5 text-text-secondary/40 cursor-not-allowed'
                : 'bg-gold-primary text-background shadow-gold-primary/20 hover:bg-gold-light'
            }`}
            aria-label="Continuar"
          >
            <ArrowRight className="w-6 h-6" />
          </motion.button>
        ) : (
          <div className="h-13 py-3" />
        )}
      </div>
    </div>
  );
};
