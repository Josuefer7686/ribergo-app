'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Send, CheckCheck, MessageSquare, ChevronRight, ArrowLeft, Bike, Sparkles, 
  Wallet, CheckCircle2, ShieldCheck, Clock, AlertTriangle, MessageCircle, ExternalLink, Flag, Lock, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';

const REPORT_REASONS = ['Apodo ofensivo', 'Malas palabras', 'Acoso o amenazas', 'Otro motivo'];

const PRESET_MESSAGES = [
  'Ya estoy cerca de tu ubicación.',
  'Perfecto, gracias.',
  'Voy por la avenida principal.',
  'Sí, aquí te espero.',
];

export const MessagesView = () => {
  const { 
    chatMessages, setChatMessages, activeTrip, assignedDriver, tripsHistory, 
    role, walletNotifications, markWalletNotificationRead, setActiveTab,
    passengerState, driverState, hiddenChatIds, hideChat,
  } = useAppStore();
  const [inputMessage, setInputMessage] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => useAppStore.getState().activeTrip?.id ?? null);
  const [room, setRoom] = useState<{ id: string | null; msgs: any[] }>({ id: null, msgs: [] });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportNote, setReportNote] = useState('');
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [reportError, setReportError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const [isWalletChatOpen, setIsWalletChatOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveChatId = selectedChatId;
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

  // Chat abierto (en curso o del historial): se lee siempre desde la base de datos
  useEffect(() => {
    if (!effectiveChatId) return;
    const unsubscribe = apiService.subscribeToMessages(effectiveChatId, (msgs) => setRoom({ id: effectiveChatId, msgs }));
    return () => unsubscribe();
  }, [effectiveChatId]);

  const roomMessages = room.id === effectiveChatId ? room.msgs : [];

  // El chat solo admite mensajes mientras el viaje está en curso
  const tripFinished = passengerState === 'TRIP_COMPLETED' || driverState === 'TRIP_COMPLETED';
  const isChatOpen = !!activeTrip && activeTrip.id === effectiveChatId && !tripFinished;

  const visibleHistory = tripsHistory.filter((t) => !hiddenChatIds.includes(t.id) && t.id !== activeTrip?.id);
  const currentTripForHeader = tripsHistory.find((t) => t.id === effectiveChatId);
  const roomName = isChatOpen ? driverName : currentTripForHeader?.driverName || driverName;

  const startPress = (id: string, name: string) => {
    longPressed.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      haptics.heavy();
      setDeleteTarget({ id, name });
    }, 550);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const submitReport = async () => {
    if (!effectiveChatId) return;
    setReportState('sending');
    setReportError('');
    const res = await apiService.reportChat(effectiveChatId, reportReason, reportNote.trim());
    if (res.ok) {
      haptics.success();
      setReportState('sent');
    } else {
      setReportError(res.error || 'No se pudo enviar el reporte.');
      setReportState('idle');
    }
  };

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
  }, [roomMessages, effectiveChatId]);

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
    if (!text.trim() || !isChatOpen) return;

    haptics.heavy();
    const currentSender = role === 'PASSENGER' ? 'PASSENGER' : 'DRIVER';
    if (!textToSend) setInputMessage('');

    if (effectiveChatId) {
      await apiService.sendMessage(effectiveChatId, currentSender, text);
    }

    setTimeout(() => scrollToBottom(), 100);
  };

  // If user is inside the official Wallet & Finance Chat Room
  if (isWalletChatOpen && role === 'DRIVER') {
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
  if (effectiveChatId) {
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
              alt={roomName}
              className="w-10 h-10 rounded-full object-cover border border-gold-primary/40 shadow-md"
            />
            {isChatOpen && <div className="w-3.5 h-3.5 rounded-full bg-gold-primary border-2 border-background absolute bottom-0 right-0 animate-pulse" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{roomName}</h3>
            <p className={`text-[11px] font-semibold flex items-center gap-1 ${isChatOpen ? 'text-gold-primary' : 'text-text-secondary'}`}>
              {isChatOpen ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-ping" />
                  <span>Viaje en curso • Riberalta</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Viaje finalizado • solo lectura</span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => { haptics.selection(); setReportState('idle'); setReportError(''); setReportOpen(true); }}
            aria-label="Reportar este chat"
            className="min-h-11 px-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
          >
            <Flag className="w-4 h-4" />
            <span>Reportar</span>
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-3 relative z-10">
          {roomMessages.length === 0 ? (
            <div className="p-6 text-center my-auto space-y-2 text-text-secondary">
              <MessageCircleIcon />
              <p className="text-xs font-semibold text-white">{isChatOpen ? 'Inicia la conversación' : 'Este viaje no tuvo mensajes'}</p>
              {isChatOpen && <p className="text-[11px]">Envía un mensaje rápido abajo.</p>}
            </div>
          ) : (
            roomMessages.map((msg) => {
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

        {!isChatOpen && (
          <div className="shrink-0 bg-surface/95 border-t border-border-custom p-4 pb-safe z-30 flex items-center justify-center gap-2 text-xs font-semibold text-text-secondary">
            <Lock className="w-4 h-4" />
            <span>El viaje terminó: ya no se pueden enviar mensajes.</span>
          </div>
        )}

        {/* Super Animated iOS 18 Input Footer */}
        {isChatOpen && (
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
        )}

        {/* Reportar chat */}
        <AnimatePresence>
          {reportOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/70 flex items-end"
              onClick={() => reportState !== 'sending' && setReportOpen(false)}
            >
              <motion.div
                initial={{ y: 80 }}
                animate={{ y: 0 }}
                exit={{ y: 80 }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Reportar chat"
                className="w-full bg-surface rounded-t-[28px] border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 max-h-[90%] overflow-y-auto"
              >
                {reportState === 'sent' ? (
                  <div className="text-center space-y-3 py-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                    <h4 className="font-display text-lg font-extrabold text-white">Reporte enviado</h4>
                    <p className="text-sm text-text-secondary">Guardamos la conversación completa. La administración la revisará y podrá sancionar o expulsar a la persona.</p>
                    <button type="button" onClick={() => setReportOpen(false)} className="w-full min-h-12 rounded-2xl bg-gold-primary text-background font-black">Listo</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-display text-lg font-extrabold text-white">Reportar a {roomName}</h4>
                        <p className="text-xs text-text-secondary mt-1">Se enviará este chat completo, junto con la fecha y los datos de la persona, a la administración.</p>
                      </div>
                      <button type="button" onClick={() => setReportOpen(false)} aria-label="Cerrar" className="w-10 h-10 shrink-0 rounded-xl bg-surface-2 text-text-secondary flex items-center justify-center"><X className="w-5 h-5" /></button>
                    </div>
                    <div role="radiogroup" aria-label="Motivo del reporte" className="grid grid-cols-2 gap-2">
                      {REPORT_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={reportReason === r}
                          onClick={() => { haptics.selection(); setReportReason(r); }}
                          className={`min-h-12 px-3 rounded-xl text-sm font-bold border transition ${reportReason === r ? 'bg-rose-500/20 border-rose-400 text-rose-200' : 'bg-surface-2 border-white/10 text-text-secondary'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reportNote}
                      onChange={(e) => setReportNote(e.target.value)}
                      maxLength={400}
                      rows={3}
                      placeholder="Cuéntanos qué pasó (opcional)"
                      className="w-full rounded-2xl bg-surface-2 border border-white/10 p-3 text-base text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary resize-none"
                    />
                    {reportError && <p role="alert" className="text-sm text-rose-300">{reportError}</p>}
                    <button
                      type="button"
                      onClick={submitReport}
                      disabled={reportState === 'sending'}
                      className="w-full min-h-12 rounded-2xl bg-rose-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Flag className="w-5 h-5" />
                      <span>{reportState === 'sending' ? 'Enviando…' : 'Enviar reporte'}</span>
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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

        {/* Canal oficial de billetera: solo conductores */}
        {role === 'DRIVER' && (
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
        )}

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
        {!activeTrip && visibleHistory.length === 0 ? (
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
        {visibleHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Historial de conversaciones</h3>
            <p className="text-[11px] text-text-secondary -mt-1">Mantén presionado un chat para borrarlo de tu lista.</p>
            <div className="space-y-2">
              {visibleHistory.map((trip) => (
                <button
                  key={trip.id}
                  onPointerDown={() => startPress(trip.id, trip.driverName)}
                  onPointerUp={endPress}
                  onPointerLeave={endPress}
                  onPointerCancel={endPress}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => {
                    if (longPressed.current) { longPressed.current = false; return; }
                    haptics.selection();
                    setSelectedChatId(trip.id);
                  }}
                  className="w-full select-none p-3.5 rounded-2xl bg-surface hover:bg-surface-2 border border-border-custom text-left flex items-center justify-between transition group"
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

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-6"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              className="w-full max-w-sm rounded-3xl bg-surface border border-white/10 p-5 space-y-4"
            >
              <h4 className="font-display text-lg font-extrabold text-white">¿Borrar el chat con {deleteTarget.name}?</h4>
              <p className="text-sm text-text-secondary">Desaparece solo de tu lista. Si hubo un problema, la administración conserva el registro.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-12 rounded-2xl bg-surface-2 border border-white/10 text-white font-bold">Cancelar</button>
                <button
                  type="button"
                  onClick={() => { hideChat(deleteTarget.id); haptics.success(); setDeleteTarget(null); }}
                  className="min-h-12 rounded-2xl bg-rose-600 text-white font-black flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Borrar</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
