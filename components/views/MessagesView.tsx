'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Send, CheckCheck, MessageSquare, ChevronRight, ArrowLeft, Bike, Sparkles, 
  Wallet, CheckCircle2, ShieldCheck, Clock, AlertTriangle, MessageCircle, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';

const PRESET_MESSAGES = [
  'Ya estoy cerca de tu ubicación.',
  'Perfecto, gracias.',
  'Voy por la avenida principal.',
  'Sí, aquí te espero.',
];

export const MessagesView = () => {
  const { 
    chatMessages, setChatMessages, activeTrip, assignedDriver, tripsHistory, 
    role, walletNotifications, markWalletNotificationRead, setActiveTab 
  } = useAppStore();
  const [inputMessage, setInputMessage] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isWalletChatOpen, setIsWalletChatOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveChatId = selectedChatId || (activeTrip ? activeTrip.id : null);
  const rideId = activeTrip?.id;

  const driverName = assignedDriver?.name || activeTrip?.driver?.name || (role === 'PASSENGER' ? 'Conductor RiberGO' : 'Pasajero RiberGO');
  const driverAvatar = assignedDriver?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  // Listen to real-time chat messages in Firestore for the active ride
  useEffect(() => {
    if (!rideId) return;
    const unsubscribe = apiService.subscribeToMessages(rideId, (msgs) => {
      setChatMessages(msgs);
    });
    return () => unsubscribe();
  }, [rideId, setChatMessages]);

  // Handle Mobile Virtual Keyboard Resize via visualViewport API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      }
    };
  }, []);

  // Scroll to bottom when messages or active chat changes
  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, effectiveChatId]);

  const handleFocus = () => {
    setIsInputFocused(true);
    // Smooth scroll to bottom after Android/iOS soft keyboard pops up
    setTimeout(() => scrollToBottom(true), 250);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > inputMessage.length) {
      haptics.selection();
      audio.keyTick();
    }
    setInputMessage(val);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    haptics.heavy();
    const currentSender = role === 'PASSENGER' ? 'PASSENGER' : 'DRIVER';
    if (!textToSend) setInputMessage('');

    if (rideId) {
      await apiService.sendMessage(rideId, currentSender, text);
    }

    setTimeout(() => scrollToBottom(), 100);
  };

  // If user is inside the official Wallet & Finance Chat Room
  if (isWalletChatOpen) {
    return (
      <div 
        className="w-full flex flex-col justify-between bg-background text-white relative overflow-hidden transition-all duration-200"
        style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      >
        {/* Header */}
        <div className="shrink-0 pt-safe px-4 py-3 bg-surface/90 border-b border-border-custom backdrop-blur-md z-20 flex items-center gap-3">
          <button
            onClick={() => {
              haptics.selection();
              setIsWalletChatOpen(false);
            }}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface text-text-secondary hover:text-white transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gold-primary to-amber-500 flex items-center justify-center text-background shadow-lg shadow-gold-primary/20">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background absolute -bottom-0.5 -right-0.5" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">Billetera & Finanzas RiberGO</h3>
              <ShieldCheck className="w-4 h-4 text-gold-primary" />
            </div>
            <p className="text-[11px] text-gold-primary font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Canal Oficial de Recargas • Riberalta</span>
            </p>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3 relative z-10">
          {/* Welcome Intro Bubble */}
          <div className="p-4 rounded-3xl bg-surface border border-border-custom text-xs space-y-2">
            <div className="flex items-center gap-2 text-gold-primary font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Centro de Notificaciones de Saldo</span>
            </div>
            <p className="text-text-secondary leading-relaxed">
              👋 ¡Hola! En este canal recibirás en tiempo real todas las confirmaciones cuando cargues saldo por QR (Yasta / Al Toque) o cuando administración verifique tus pagos.
            </p>
          </div>

          {/* List of Wallet Notifications */}
          {walletNotifications.length === 0 ? (
            <div className="p-8 text-center bg-surface-2/40 border border-border-custom rounded-3xl space-y-2 my-4">
              <Wallet className="w-8 h-8 mx-auto text-gold-primary opacity-60" />
              <p className="text-xs font-bold text-white">Sin recargas registradas aún</p>
              <p className="text-[11px] text-text-secondary max-w-[240px] mx-auto">
                Cuando subas tu comprobante de QR, verás aquí el estado y confirmación inmediata.
              </p>
            </div>
          ) : (
            walletNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`p-4 rounded-3xl border text-xs space-y-2.5 shadow-lg ${
                  notif.status === 'APPROVED'
                    ? 'bg-surface border-emerald-500/40 shadow-emerald-500/10'
                    : 'bg-surface border-rose-500/40 shadow-rose-500/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      notif.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {notif.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{notif.status === 'APPROVED' ? 'Aprobado con Éxito' : 'Rechazado'}</span>
                  </span>
                  <span className="text-[10px] text-text-secondary font-medium">
                    {notif.date} • {notif.time}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">{notif.title}</h4>
                  <p className="text-text-secondary text-xs leading-relaxed">{notif.message}</p>
                </div>

                <div className="p-2.5 rounded-2xl bg-surface-2 border border-border-custom text-[11px] flex items-center justify-between">
                  <span className="text-text-secondary">Código comprobante:</span>
                  <span className="font-mono text-white font-bold">{notif.rechargeId}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface/90 border-t border-border-custom backdrop-blur-md space-y-2">
          <button
            type="button"
            onClick={() => {
              haptics.heavy();
              setIsWalletChatOpen(false);
              setActiveTab('INCOME');
            }}
            className="w-full py-3 rounded-2xl bg-gold-primary hover:bg-gold-light text-background font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-gold-primary/25 active:scale-[0.98] transition"
          >
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span>Ir a Billetera / Nueva Recarga QR</span>
          </button>
        </div>
      </div>
    );
  }

  // If user is inside a specific Ride Chat Room
  if (effectiveChatId && (activeTrip || tripsHistory.some(t => t.id === effectiveChatId))) {
    return (
      <div 
        className="w-full flex flex-col justify-between bg-background text-white relative overflow-hidden transition-all duration-200"
        style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      >
        {/* Header */}
        <div className="shrink-0 pt-safe px-4 py-3 bg-surface/90 border-b border-border-custom backdrop-blur-md z-20 flex items-center gap-3">
          <button
            onClick={() => {
              haptics.selection();
              setSelectedChatId(null);
            }}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface text-text-secondary hover:text-white transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={driverAvatar}
              alt={driverName}
              className="w-10 h-10 rounded-full object-cover border border-gold-primary/40 shadow-md"
            />
            <div className="w-3.5 h-3.5 rounded-full bg-gold-primary border-2 border-background absolute bottom-0 right-0 animate-pulse" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{driverName}</h3>
            <p className="text-[11px] text-gold-primary font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-ping" />
              <span>Viaje en curso • Riberalta</span>
            </p>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3 relative z-10">
          {chatMessages.length === 0 ? (
            <div className="p-6 text-center my-auto space-y-2 text-text-secondary">
              <MessageCircleIcon />
              <p className="text-xs font-semibold text-white">Inicia la conversación</p>
              <p className="text-[11px]">Envía un mensaje rápido a tu mototaxista abajo.</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isMe = (role === 'PASSENGER' && msg.sender === 'PASSENGER') || (role === 'DRIVER' && msg.sender === 'DRIVER');
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs space-y-1 ${
                      isMe
                        ? 'bg-gold-primary text-background font-bold rounded-br-none shadow-lg shadow-gold-primary/20'
                        : 'bg-surface-2 border border-border-custom text-white rounded-bl-none backdrop-blur-md'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center justify-end gap-1 text-[9px] ${isMe ? 'text-background/80 font-bold' : 'text-text-secondary'}`}>
                      <span>{msg.time}</span>
                      {isMe && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Super Animated iOS 18 Input Footer */}
        <div className="shrink-0 bg-surface/95 border-t border-border-custom backdrop-blur-2xl p-3 z-30 space-y-2.5 shadow-2xl">
          {/* Quick Presets Scrollable */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {PRESET_MESSAGES.map((preset, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend(preset)}
                className="px-3.5 py-1.5 rounded-full bg-surface-2 hover:bg-surface border border-gold-primary/30 text-[11px] font-semibold text-gold-light whitespace-nowrap transition shadow-sm active:border-gold-primary"
              >
                {preset}
              </motion.button>
            ))}
          </div>

          {/* Typing Container with Dynamic Animated Border */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center gap-2"
          >
            <motion.div 
              animate={{
                boxShadow: isInputFocused || inputMessage.length > 0
                  ? '0 0 20px rgba(244,197,66,0.35)'
                  : '0 0 0px rgba(0,0,0,0)',
                borderColor: isInputFocused || inputMessage.length > 0
                  ? '#F4C542'
                  : 'rgba(255,255,255,0.12)',
              }}
              className="flex-1 flex items-center bg-surface-2 border rounded-2xl px-3.5 py-1 transition-all duration-300"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onFocus={handleFocus}
                onBlur={() => setIsInputFocused(false)}
                onChange={handleInputChange}
                placeholder="Escribe un mensaje en vivo..."
                className="w-full bg-transparent py-2.5 text-xs text-white placeholder-text-secondary focus:outline-none tracking-wide"
              />

              {/* Animated Typing Letter Counter */}
              <AnimatePresence>
                {inputMessage.length > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="px-2 py-0.5 rounded-full bg-gold-primary/20 text-gold-primary text-[10px] font-black shrink-0 border border-gold-primary/30 ml-2"
                  >
                    {inputMessage.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Spring Animated Send Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                backgroundColor: inputMessage.trim().length > 0 ? '#F4C542' : 'rgba(255,255,255,0.08)',
                color: inputMessage.trim().length > 0 ? '#05080B' : '#71717A',
                boxShadow: inputMessage.trim().length > 0 ? '0 0 16px rgba(244,197,66,0.5)' : 'none',
              }}
              disabled={!inputMessage.trim()}
              className="p-3 rounded-2xl transition flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              {inputMessage.trim().length > 0 ? (
                <motion.div initial={{ rotate: -20, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }}>
                  <Send className="w-4 h-4 fill-current" />
                </motion.div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </form>
        </div>
      </div>
    );
  }

  // Conversation Threads List View
  return (
    <div className="w-full h-full bg-background p-4 sm:p-6 text-white overflow-y-auto no-scrollbar">
      <div className="pt-safe max-w-sm mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Mensajes</h2>
            <p className="text-xs text-text-secondary">Tus chats en tiempo real en Riberalta</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-border-custom flex items-center justify-center text-gold-primary">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* PINNED OFFICIAL WALLET CHANNEL CARD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gold-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Canal Oficial de Finanzas</span>
            </h3>
            {walletNotifications.filter((n) => !n.read).length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gold-primary text-background text-[10px] font-black uppercase shadow-md shadow-gold-primary/30 animate-pulse">
                {walletNotifications.filter((n) => !n.read).length} nuevo
              </span>
            )}
          </div>

          <button
            onClick={() => {
              haptics.selection();
              walletNotifications.forEach((n) => markWalletNotificationRead(n.id));
              setIsWalletChatOpen(true);
            }}
            className="w-full p-4 rounded-3xl bg-surface hover:bg-surface-2 border border-gold-primary/40 text-left flex items-center justify-between transition shadow-xl group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-primary to-amber-500 flex items-center justify-center text-background shadow-lg shadow-gold-primary/20 group-hover:scale-105 transition">
                  <Wallet className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background absolute -bottom-0.5 -right-0.5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white">Billetera & Finanzas</h4>
                  <ShieldCheck className="w-4 h-4 text-gold-primary" />
                </div>
                <p className="text-xs text-text-secondary font-medium mt-0.5 truncate max-w-[200px]">
                  {walletNotifications.length > 0
                    ? walletNotifications[0].title + ': ' + walletNotifications[0].message
                    : 'Avisos oficiales de recarga por QR y saldo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-secondary font-bold">
                {walletNotifications.length > 0 ? walletNotifications[0].time : 'Oficial'}
              </span>
              <ChevronRight className="w-5 h-5 text-gold-primary group-hover:translate-x-1 transition" />
            </div>
          </button>
        </div>

        {/* ACTIVE TRIP CHAT CARD */}
        {activeTrip ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gold-primary uppercase tracking-wider">Chat en viaje activo</h3>
            <button
              onClick={() => {
                haptics.selection();
                setSelectedChatId(activeTrip.id);
              }}
              className="w-full p-4 rounded-3xl bg-surface border-2 border-gold-primary/60 hover:bg-surface-2 text-left flex items-center justify-between transition shadow-xl group"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={driverAvatar}
                    alt={driverName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-gold-primary"
                  />
                  <div className="w-3.5 h-3.5 rounded-full bg-gold-primary border-2 border-background absolute bottom-0 right-0 animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{driverName}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-gold-primary/20 text-[9px] font-black text-gold-primary uppercase border border-gold-primary/30">
                      En Curso
                    </span>
                  </div>
                  <p className="text-xs text-gold-light font-medium mt-0.5 truncate max-w-[200px]">
                    {chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].text : 'Toca para abrir el chat del viaje'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gold-primary group-hover:translate-x-1 transition" />
            </button>
          </div>
        ) : null}

        {/* EMPTY STATE WHEN NO ACTIVE TRIP AND NO CHATS */}
        {!activeTrip && tripsHistory.length === 0 ? (
          <div className="p-8 text-center bg-surface rounded-3xl border border-border-custom space-y-3 my-8">
            <div className="w-16 h-16 rounded-3xl bg-surface-2 border border-border-custom flex items-center justify-center text-text-secondary mx-auto">
              <MessageSquare className="w-8 h-8 opacity-40 text-gold-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Sin conversaciones activas</p>
              <p className="text-xs text-text-secondary mt-1 max-w-[260px] mx-auto leading-relaxed">
                No tienes ningún viaje activo en este momento. Al solicitar un mototaxi, podrás chatear en tiempo real aquí.
              </p>
            </div>
          </div>
        ) : null}

        {/* PAST TRIPS CHAT THREADS */}
        {tripsHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Historial de conversaciones</h3>
            <div className="space-y-2">
              {tripsHistory.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => {
                    haptics.selection();
                    setSelectedChatId(trip.id);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-surface hover:bg-surface-2 border border-border-custom text-left flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-custom flex items-center justify-center text-gold-primary">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{trip.driverName}</p>
                      <p className="text-[11px] text-text-secondary">{trip.destination} • {trip.date}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function MessageCircleIcon() {
  return (
    <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-custom flex items-center justify-center text-gold-primary mx-auto">
      <MessageSquare className="w-6 h-6 opacity-60" />
    </div>
  );
}
