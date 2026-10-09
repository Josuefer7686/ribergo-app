'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { audio } from '@/utils/audio';
import { haptics } from '@/utils/haptics';
import { notifications } from '@/utils/notifications';

export interface ToastMessageData {
  id: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  time: string;
}

interface IosMessageToastProps {
  toast: ToastMessageData | null;
  onClose: () => void;
  onOpenChat: () => void;
}

export const IosMessageToast = ({ toast, onClose, onOpenChat }: IosMessageToastProps) => {
  useEffect(() => {
    if (toast) {
      // Play iOS message chime sound & rhythmic haptic vibration pattern
      audio.messageReceived();
      haptics.notification();

      // Trigger native browser notification if allowed
      notifications.sendNativeNotification(
        `RiberGO: ${toast.senderName}`,
        toast.text,
        toast.senderAvatar
      );

      // Auto dismiss after 5.5s
      const timer = setTimeout(() => {
        onClose();
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  return (
    <AnimatePresence>
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-[420px] pointer-events-auto">
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={() => {
              haptics.selection();
              onOpenChat();
              onClose();
            }}
            className="p-3.5 rounded-3xl bg-surface/90 border border-gold-primary/40 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-white flex items-center justify-between gap-3 cursor-pointer group active:scale-98 transition"
          >
            {/* Sender Avatar / Icon */}
            <div className="relative shrink-0">
              {toast.senderAvatar ? (
                <img
                  src={toast.senderAvatar}
                  alt={toast.senderName}
                  className="w-11 h-11 rounded-2xl object-cover border border-gold-primary/50"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary">
                  <MessageSquare className="w-5 h-5" />
                </div>
              )}
              <div className="w-3.5 h-3.5 rounded-full bg-gold-primary border-2 border-background absolute -bottom-0.5 -right-0.5 animate-pulse" />
            </div>

            {/* Message Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white truncate">{toast.senderName}</span>
                <span className="text-[10px] text-gold-primary font-bold">{toast.time}</span>
              </div>
              <p className="text-xs text-text-secondary truncate mt-0.5 font-medium leading-tight">
                {toast.text}
              </p>
            </div>

            {/* Action Icon */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="px-2 py-1 rounded-xl bg-gold-primary/10 text-gold-primary text-[10px] font-black uppercase border border-gold-primary/20 group-hover:bg-gold-primary group-hover:text-background transition">
                Ver
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1 rounded-full text-text-secondary hover:text-white"
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
