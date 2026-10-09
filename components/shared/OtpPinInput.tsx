'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface OtpPinInputProps {
  value: string;
  length?: number;
}

export const OtpPinInput: React.FC<OtpPinInputProps> = ({ value, length = 6 }) => {
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-3">
      {digits.map((digit, index) => {
        const isFilled = Boolean(digit);
        const isCurrent = value.length === index;

        return (
          <motion.div
            key={index}
            initial={{ scale: 1 }}
            animate={{
              scale: isFilled ? [1, 1.12, 1] : 1,
              borderColor: isCurrent
                ? '#F4C542'
                : isFilled
                ? 'rgba(244, 197, 66, 0.6)'
                : 'rgba(255, 255, 255, 0.12)',
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl bg-surface border-2 flex items-center justify-center text-xl font-bold font-mono transition-all shadow-md ${
              isCurrent
                ? 'shadow-gold-primary/30 ring-2 ring-gold-primary/20 bg-surface-2'
                : isFilled
                ? 'text-gold-primary bg-surface-2/80'
                : 'text-text-secondary/40'
            }`}
          >
            {digit ? (
              <motion.span
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gold-primary font-mono text-2xl font-bold"
              >
                {digit}
              </motion.span>
            ) : (
              isCurrent && (
                <motion.div
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2.5 h-2.5 rounded-full bg-gold-primary"
                />
              )
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
