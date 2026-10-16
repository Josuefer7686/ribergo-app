'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Send, Sparkles, MapPin, DollarSign, Check, X, Shield, 
  MessageSquare, Bike, User, ChevronRight, ThumbsUp, Flame, AlertCircle,
  Plus, Minus
 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';

// Lugares típicos de Riberalta para selección con un solo toque
const RIBERALTA_QUICK_DESTINATIONS = [
  'Final Jacarandá',
  'Barrio Concesión Forestal',
  'Barrio Los Tajibos',
  'Hospital General / Los Almendros',
  'Mercado Central / Plaza 3 de Febrero',
  'Aeropuerto / Av. Integración',
  'San José / El Triángulo',
  'Terminal de Buses',
];

export const NegotiationChatModal = () => {
  const { 
    user, 
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
  const [selectedDestinationName, setSelectedDestinationName] = useState<string>(activeTrip?.destination?.name || '');
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Escuchar únicamente resize del visualViewport móvil (evitar evento 'scroll' que cierra el teclado al editar texto)
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
  }, []);

  const rideId = activeTrip?.id;
  const myRole = isPassenger ? 'PASSENGER' : 'DRIVER';
  const [adjustedFare, setAdjustedFare] = useState<number | null>(null);
  const debounceFareTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tarifa efectiva: si el usuario está pulsando +/- usa adjustedFare local, de lo contrario la tarifa en store
  const localFare = adjustedFare !== null 
    ? adjustedFare 
    : (activeTrip?.proposedPrice || activeTrip?.price || 10);

  const hasSentGreetingRef = useRef(false);

  // Suscribirse a mensajes del chat
  useEffect(() => {
    if (!rideId) return;
    const unsubscribe = apiService.subscribeToMessages(rideId, (msgs) => {
      setChatMessages(msgs);
      if (!isPassenger && (!msgs || msgs.length === 0) && !hasSentGreetingRef.current) {
        hasSentGreetingRef.current = true;
        apiService.sendMessage(
          rideId, 
          'DRIVER', 
          '¡Buenas pariente! ¿A qué lugar o barrio vamos a ir, camba?'
        );
      }
    });
    return () => unsubscribe();
  }, [rideId, isPassenger, setChatMessages]);

  // Mantener scroll al final solo cuando llega un nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  if (!isNegotiating || !activeTrip) return null;

  // Enviar mensaje de texto con emisión instantánea (0ms)
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !rideId) return;

    haptics.selection();
    setInputMessage('');

    // Emitir mensaje por el bus local a 0ms y sincronizar con Firestore en segundo plano
    apiService.sendMessage(rideId, myRole, text);

    // Si el pasajero escribe un lugar o lo pulsa de los chips, actualizar el destino
    if (isPassenger) {
      setSelectedDestinationName(text);
      if (activeTrip) {
        setActiveTrip({
          ...activeTrip,
          destination: {
            ...(activeTrip.destination || { lat: -11.0061, lng: -66.0747 }),
            name: text,
          }
        });
      }
    }
  };

  // Proponer tarifa con debounce (aumenta o resta instantáneamente a 0ms sin saltos ni retrocesos)
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

    // 2. Debounce: Si el usuario pulsa 3 veces seguidas rápido, solo se envía 1 sola solicitud con el valor final
    if (debounceFareTimerRef.current) {
      clearTimeout(debounceFareTimerRef.current);
    }

    debounceFareTimerRef.current = setTimeout(async () => {
      try {
        await apiService.proposeRideFare(
          rideId, 
          clampedPrice, 
          myRole,
          selectedDestinationName || activeTrip.destination?.name
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

  // Aceptar la tarifa y cerrar negociación (0ms)
  const handleAcceptFareAndStart = async () => {
    if (!rideId) return;
    haptics.success();
    audio.driverTripAccepted();

    const finalPrice = localFare;
    const finalDest = selectedDestinationName || activeTrip.destination.name || 'Destino acordado';
    const currentRideId = rideId;

    // 1. Optimistic UI: cerrar modal de negociación y avanzar estado inmediatamente (0ms)
    if (isPassenger) {
      setPassengerState('DRIVER_FOUND');
    } else {
      setDriverState('GOING_TO_PASSENGER');
    }

    setActiveTrip({
      ...activeTrip,
      price: finalPrice,
      proposedPrice: finalPrice,
      fareAgreed: true,
      destination: {
        ...(activeTrip.destination || { lat: -11.0061, lng: -66.0747 }),
        name: finalDest,
      }
    });

    // 2. Notificar en Firestore de fondo
    await apiService.confirmRideFare(currentRideId, finalPrice, finalDest);
    await apiService.sendMessage(
      currentRideId, 
      myRole, 
      `¡Trato hecho camba! Nos vemos en ${finalPrice} BOB. Voy en camino.`
    );
  };

  // Cancelar negociación / rechazar conductor o pasajero para buscar otro (0ms)
  const handleRejectOrCancel = () => {
    if (!rideId) return;
    haptics.error();
    const currentRideId = rideId;

    // Si es conductor el que abandona la negociación, marcar el viaje como rechazado para no volver a recibirlo
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

    // 1. Optimistic UI: salir de negociación en 0ms
    if (isPassenger) {
      setPassengerState('SEARCHING_DRIVER');
    } else {
      setActiveTrip(null);
      setDriverState('ONLINE');
    }

    // 2. Liberar en Firestore de fondo
    apiService.releaseRideNegotiation(currentRideId);
  };

  const otherPersonName = isPassenger 
    ? (activeTrip.driver?.name || 'Mototaxista Riberalta') 
    : (activeTrip.passengerName || 'Pasajero');

  return (
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
                {isPassenger ? 'Mototaxi en contacto • Negociando' : 'Pasajero en contacto • Acordando viaje'}
              </p>
            </div>
          </div>

          <button
            onClick={handleRejectOrCancel}
            className="p-2 rounded-xl bg-surface-2 hover:bg-rose-500/20 text-text-secondary hover:text-rose-400 border border-border-custom transition text-xs font-bold flex items-center gap-1 active:scale-95"
            title="Cancelar y buscar otro"
          >
            <X className="w-4 h-4" />
            <span className="text-[10px]">Dejar</span>
          </button>
        </div>

        {/* BARRA SUPERIOR DE TARIFA DINÁMICA (SOLO 2 PINCHES BOTONES: - y + DE A 1 BS) */}
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

          {/* ÚNICOS DOS BOTONES: -1 Bs y +1 Bs */}
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
            <span>Ponte de acuerdo en el lugar y el pasaje</span>
          </p>
          <p className="text-[10px] text-text-secondary">
            {isPassenger 
              ? 'Dile al chofer a qué barrio vas. Si es lejos (Jacarandá, Concesión), acuerden una tarifa justa.' 
              : 'Pregunta el destino antes de partir para evitar problemas con la gasolina.'}
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
                className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
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

      {/* CONTROLES INFERIORES: CHIPS RÁPIDOS Y TECLADO */}
      <div className={`p-3 bg-surface border-t border-border-custom space-y-2 shrink-0 ${viewportHeight && viewportHeight < 550 ? 'pb-2' : 'pb-safe'}`}>
        {/* Chips de destinos comunes de Riberalta (solo para pasajero) */}
        {isPassenger && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gold-primary" />
              Toca para avisar tu destino rápido:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {RIBERALTA_QUICK_DESTINATIONS.map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => handleSendMessage(`Voy a ${dest}, pariente.`)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-gold-primary/30 text-white font-bold text-[11px] whitespace-nowrap active:scale-95 transition shrink-0"
                >
                  📍 {dest}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chips de respuestas rápidas para conductor */}
        {!isPassenger && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['¿A qué barrio vamos pariente?', 'Hasta allá son 15 Bs camba', '¿Cerca o lejos?', '¡Ya voy saliendo!'].map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleSendMessage(phrase)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-gold-primary/30 text-white font-bold text-[11px] whitespace-nowrap active:scale-95 transition shrink-0"
              >
                💬 {phrase}
              </button>
            ))}
          </div>
        )}

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
            placeholder={isPassenger ? 'Escribe a dónde vas (ej: Final Jacarandá)...' : 'Escribe tu respuesta camba...'}
            className="flex-1 bg-surface-2 border border-border-custom rounded-2xl py-3 px-4 text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary transition"
            style={{
              fontSize: '16px', // 16px exacto para prevenir el auto-zoom de iOS Safari que rompe el cursor y cierra el teclado
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

        {/* Botón flotante para confirmar y empezar el viaje */}
        <button
          onClick={handleAcceptFareAndStart}
          className="w-full py-3 bg-gradient-to-r from-gold-primary to-amber-400 text-background rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-[0.98]"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Confirmar e Iniciar Viaje por {localFare} BOB</span>
        </button>
      </div>
    </motion.div>
  );
};
