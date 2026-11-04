'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Send, Sparkles, DollarSign, Check, X, 
  Bike, User, Plus, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';

// Mensajes predefinidos y ubicaciones frecuentes para el Pasajero
const PASSENGER_QUICK_CHIPS = [
  '📍 Final Jacarandá',
  '📍 Barrio Concesión Forestal',
  '📍 Barrio Los Tajibos',
  '📍 Hospital General',
  '📍 Mercado Central',
  '📍 Aeropuerto',
  '📍 Terminal de Buses',
  '📍 Barrio Los Almendros',
  '📍 Barrio San José',
  '💬 ¿Cuánto me cobras pariente?',
  '💬 Te espero en la esquina',
  '💬 ¿Ya vienes?',
];

// Mensajes predefinidos para el Conductor
const DRIVER_QUICK_CHIPS = [
  '💬 ¿A qué barrio vamos pariente?',
  '💬 Hasta allá son 15 Bs camba',
  '💬 ¿Cerca o lejos?',
  '💬 ¡Ya voy saliendo!',
  '💬 ¿Dónde te espero?',
  '💬 Voy en camino pariente 🏍️',
  '💬 Trato hecho, ya llego',
];

export const NegotiationChatModal = () => {
  const { 
    role, 
    activeTrip, 
    setActiveTrip, 
    passengerState, 
    setPassengerState,
    driverState, 
    setDriverState,
    chatMessages, 
    setChatMessages 
  } = useAppStore();

  const isPassenger = role === 'PASSENGER';
  const isNegotiating = (isPassenger && passengerState === 'NEGOTIATING') || (!isPassenger && driverState === 'NEGOTIATING');

  const [inputMessage, setInputMessage] = useState('');
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [showCupertinoCancelModal, setShowCupertinoCancelModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Escuchar únicamente resize del visualViewport móvil
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let lastH = 0;
      const updateHeight = () => {
        const h = window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight;
        if (Math.abs(h - lastH) > 10) {
          lastH = h;
          setViewportHeight(h);
        }
      };

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateHeight);
        updateHeight();
      } else {
        window.addEventListener('resize', updateHeight);
      }

      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', updateHeight);
        } else {
          window.removeEventListener('resize', updateHeight);
        }
      };
    }
  }, []);

  const rideId = activeTrip?.id;
  const myRole = isPassenger ? 'PASSENGER' : 'DRIVER';
  const [adjustedFare, setAdjustedFare] = useState<number | null>(null);
  const debounceFareTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tarifa efectiva: si el usuario está pulsando +/- usa adjustedFare local, de lo contrario la tarifa en store
  const localFare = adjustedFare !== null 
    ? adjustedFare 
    : (activeTrip?.proposedPrice || activeTrip?.price || 10);

  // Suscribirse a mensajes del chat
  useEffect(() => {
    if (!rideId) return;
    const unsubscribe = apiService.subscribeToMessages(rideId, (msgs) => {
      setChatMessages(msgs);
    });
    return () => unsubscribe();
  }, [rideId, setChatMessages]);

  // Mantener scroll al final cuando llega un nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  if (!isNegotiating || !activeTrip) return null;

  // Enviar mensaje de texto
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !rideId) return;

    haptics.selection();
    setInputMessage('');
    apiService.sendMessage(rideId, myRole, text);
  };

  // Proponer tarifa con debounce (+ / -)
  const handleProposeFare = (newPrice: number) => {
    if (!rideId) return;
    haptics.heavy();

    const clampedPrice = Math.max(5, Math.min(200, newPrice));
    
    // 1. Actualización visual instantánea a 0ms en pantalla y en store
    setAdjustedFare(clampedPrice);
    if (activeTrip) {
      setActiveTrip({
        ...activeTrip,
        proposedPrice: clampedPrice,
        priceOfferedBy: myRole,
      });
    }

    // 2. Debounce: 1 sola llamada tras terminar de pulsar
    if (debounceFareTimerRef.current) {
      clearTimeout(debounceFareTimerRef.current);
    }

    debounceFareTimerRef.current = setTimeout(async () => {
      try {
        await apiService.proposeRideFare(
          rideId, 
          clampedPrice, 
          myRole,
          activeTrip.destination?.name
        );

        const msgText = isPassenger 
          ? `Te ofrezco ${clampedPrice} BOB pariente, ¿le metemos?` 
          : `Por la distancia hasta allá te sale ${clampedPrice} BOB camba, ¿trato hecho?`;

        await apiService.sendMessage(rideId, myRole, msgText);
      } catch (err) {
        console.warn('Error proponiendo tarifa debounced:', err);
      } finally {
        setAdjustedFare(null);
      }
    }, 450);
  };

  // Aceptar la tarifa y cerrar negociación (EXCLUSIVO DEL CONDUCTOR)
  const handleAcceptFareAndStart = async () => {
    if (!rideId || isPassenger) return;
    haptics.success();
    audio.driverTripAccepted();

    const finalPrice = localFare;
    const currentRideId = rideId;
    const finalDest = activeTrip.destination;

    // Conductor inicia el viaje y se dirige al pasajero
    setDriverState('GOING_TO_PASSENGER');

    setActiveTrip({
      ...activeTrip,
      price: finalPrice,
      proposedPrice: finalPrice,
      fareAgreed: true,
      destination: finalDest,
    });

    // Notificar en Firestore de fondo
    await apiService.confirmRideFare(currentRideId, finalPrice, finalDest);
    await apiService.sendMessage(
      currentRideId, 
      myRole, 
      `¡Trato hecho camba! Nos vemos en ${finalPrice} BOB. Voy en camino.`
    );
  };

  // Cancelar negociación / rechazar
  const handleRejectOrCancel = () => {
    if (!rideId) return;
    haptics.error();
    const currentRideId = rideId;

    if (!isPassenger) {
      try {
        const raw = sessionStorage.getItem('ribergo_rejected_rides');
        const list = raw ? JSON.parse(raw) : [];
        if (!list.includes(currentRideId)) {
          list.push(currentRideId);
          sessionStorage.setItem('ribergo_rejected_rides', JSON.stringify(list));
        }
      } catch (e) {}
    }

    // Salir de negociación
    if (isPassenger) {
      setPassengerState('SEARCHING_DRIVER');
    } else {
      setActiveTrip(null);
      setDriverState('ONLINE');
    }

    apiService.releaseRideNegotiation(currentRideId);
  };

  const otherPersonName = isPassenger 
    ? (activeTrip.driver?.name || 'Mototaxista Riberalta') 
    : (activeTrip.passengerName || 'Pasajero');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-0 top-0 z-50 bg-background flex flex-col justify-between max-w-md mx-auto overflow-hidden shadow-2xl"
        style={{
          height: viewportHeight ? `${viewportHeight}px` : '100dvh',
          maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
        }}
      >
        {/* HEADER NEGOCIACIÓN */}
        <div className="pt-safe px-4 pt-3 pb-2.5 bg-surface border-b border-border-custom shadow-md space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold-primary/20 border-2 border-gold-primary/50 flex items-center justify-center text-gold-primary shadow-lg shadow-gold-primary/10">
                {isPassenger ? <Bike className="w-5 h-5 animate-pulse" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-sm font-black text-white">{otherPersonName}</h3>
                </div>
                <p className="text-[11px] text-gold-light font-semibold">
                  {isPassenger ? 'Conductor en contacto • Negociando' : 'Pasajero en contacto • Acordando viaje'}
                </p>
              </div>
            </div>

            {/* BOTÓN CANCELAR / DEJAR */}
            <button
              type="button"
              onClick={() => {
                if (isPassenger) {
                  setShowCupertinoCancelModal(true);
                } else {
                  handleRejectOrCancel();
                }
              }}
              className="p-2 rounded-xl bg-surface-2 hover:bg-rose-500/20 text-text-secondary hover:text-rose-400 border border-border-custom transition text-xs font-bold flex items-center gap-1 active:scale-95"
              title="Cancelar y buscar otro"
            >
              <X className="w-4 h-4" />
              <span className="text-[10px]">Dejar</span>
            </button>
          </div>

          {/* BARRA SUPERIOR DE TARIFA DINÁMICA (- y +) */}
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-surface-2 via-surface to-surface-2 border border-gold-primary/40 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary shrink-0">
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary block">
                  Tarifa propuesta
                </span>
                <span className="text-lg font-black text-gold-primary leading-none">
                  {localFare} <span className="text-xs font-bold text-white">BOB</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleProposeFare(localFare - 1)}
                className="w-10 h-10 rounded-2xl bg-surface-2 hover:bg-surface border border-gold-primary/40 text-gold-primary flex items-center justify-center transition active:scale-90 shadow-sm shrink-0"
                title="Quitar 1 Bs"
              >
                <Minus className="w-5 h-5 stroke-[3]" />
              </button>

              <span className="text-xs font-black text-white px-0.5 select-none whitespace-nowrap">
                {localFare} Bs
              </span>

              <button
                type="button"
                onClick={() => handleProposeFare(localFare + 1)}
                className="w-10 h-10 rounded-2xl bg-gold-primary hover:bg-gold-light text-background flex items-center justify-center transition active:scale-90 shadow-md shadow-gold-primary/25 shrink-0"
                title="Aumentar 1 Bs"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DE MENSAJES DEL CHAT */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Banner de inicio amistoso */}
          <div className="p-3 rounded-2xl bg-surface/60 border border-border-custom text-center space-y-1">
            <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-primary" />
              <span>Regateo y coordinación del viaje</span>
            </p>
            <p className="text-[10px] text-text-secondary">
              {isPassenger 
                ? 'Coordina tu destino y pasaje con el conductor. Solo el conductor puede iniciar el viaje.' 
                : 'El conductor tiene el mando para aceptar e iniciar el viaje cuando ambos estén conformes.'}
            </p>
          </div>

          {/* Historial de Mensajes */}
          {chatMessages && chatMessages.map((msg, index) => {
            const isMe = (isPassenger && msg.sender === 'PASSENGER') || (!isPassenger && msg.sender === 'DRIVER');
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[84%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    isMe
                      ? 'bg-gold-primary text-background font-semibold rounded-br-xs shadow-md shadow-gold-primary/20'
                      : 'bg-surface-2 border border-border-custom text-white rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-text-secondary mt-1 px-1">
                  {msg.time || 'Ahora'}
                </span>
              </motion.div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* CONTROLES INFERIORES */}
        <div className={`p-3 bg-surface border-t border-border-custom space-y-2 shrink-0 ${viewportHeight && viewportHeight < 550 ? 'pb-2' : 'pb-safe'}`}>
          {/* Chips de mensajes rápidos según el rol */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(isPassenger ? PASSENGER_QUICK_CHIPS : DRIVER_QUICK_CHIPS).map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleSendMessage(phrase)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-gold-primary/30 text-white font-bold text-[11px] whitespace-nowrap active:scale-95 transition shrink-0"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Input de texto y botón enviar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              onFocus={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 200);
              }}
              placeholder={isPassenger ? 'Escribe tu mensaje al conductor...' : 'Escribe tu respuesta camba...'}
              className="flex-1 bg-surface-2 border border-border-custom rounded-2xl py-3 px-4 text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary transition"
              style={{
                fontSize: '16px',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
              autoComplete="off"
              autoCorrect="on"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              className="w-11 h-11 rounded-2xl bg-gold-primary hover:bg-gold-light disabled:opacity-40 text-background flex items-center justify-center transition active:scale-95 shadow-md shadow-gold-primary/20 shrink-0"
            >
              <Send className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* BOTÓN INFERIOR: EXCLUSIVO DEL CONDUCTOR */}
          {!isPassenger && (
            <button
              onClick={handleAcceptFareAndStart}
              className="w-full py-3.5 bg-gradient-to-r from-gold-primary to-amber-400 text-background rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirmar e Iniciar Viaje por {localFare} BOB</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* MODAL DE CONFIRMACIÓN CUPERTINO (ESTILO iOS) PARA EL PASAJERO AL CANCELAR */}
      <AnimatePresence>
        {showCupertinoCancelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[270px] bg-[#1C1C1E]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl text-center flex flex-col"
            >
              <div className="p-4 pb-3 space-y-1">
                <h4 className="text-base font-bold text-white tracking-tight">
                  ¿Cancelar viaje?
                </h4>
                <p className="text-xs text-neutral-300 leading-snug font-normal">
                  ¿Estás seguro de que deseas salir del chat y cancelar este viaje con el conductor?
                </p>
              </div>
              
              <div className="grid grid-cols-2 border-t border-white/10 text-sm font-semibold divide-x divide-white/10">
                <button
                  type="button"
                  onClick={() => setShowCupertinoCancelModal(false)}
                  className="py-3 text-blue-400 hover:bg-white/5 active:bg-white/10 transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCupertinoCancelModal(false);
                    handleRejectOrCancel();
                  }}
                  className="py-3 text-rose-500 font-bold hover:bg-white/5 active:bg-white/10 transition"
                >
                  Sí, cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
