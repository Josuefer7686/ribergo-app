'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface IosModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const IosModal = ({ isOpen, onClose, title, children }: IosModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center max-w-[430px] mx-auto">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Card Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative z-10 w-full max-h-[85vh] bg-surface/95 border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col backdrop-blur-2xl overflow-hidden text-white"
          >
            {/* Top iOS Drag Handle */}
            <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-4 shrink-0" />

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between pb-3 border-b border-border-custom mb-3 shrink-0">
                <h3 className="text-base font-extrabold text-white tracking-tight">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-surface-2 text-text-secondary hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-0.5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
