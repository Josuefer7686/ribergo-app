'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Send, Sparkles, MapPin, DollarSign, Check, X, 
  Bike, User, ChevronRight, Plus, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { apiService } from '@/services/apiService';
import { 
  searchRiberaltaLocations, 
  createCustomDestination, 
  RiberaltaPlace,
  RIBERALTA_PLACES 
} from '@/utils/riberaltaPlaces';

// Destinos populares directos para chips rápidos iniciales
const POPULAR_QUICK_PLACES = [
  'Los Almendros',
  'Final Jacarandá',
  'Mercado Central',
  'Hospital General',
  'Barrio Los Tajibos',
  'Concesión Forestal',
  'Terminal de Buses',
  'Barrio San José',
];

export const NegotiationChatModal = () => {
  const { 
    user, 
    role, 
    activeTrip, 
    setActiveTrip, 
    setDestination,
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
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
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

  const hasSentGreetingRef = useRef(false);

  // Suscribirse a mensajes del chat
  useEffect(() => {
    if (!rideId) return;
    const unsubscribe = apiService.subscribeToMessages(rideId, (msgs) => {
      setChatMessages(msgs);
      // Saludo automático garantizado del conductor preguntando el destino
      if ((!msgs || msgs.length === 0) && !hasSentGreetingRef.current) {
        hasSentGreetingRef.current = true;
        apiService.sendMessage(
          rideId, 
          'DRIVER', 
          '¡Buenas pariente! ¿A qué lugar o calle vamos? 📍'
        );
      }
    });
    return () => unsubscribe();
  }, [rideId, setChatMessages]);

  // Mantener scroll al final cuando llega un nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Detección: ¿El pasajero ya respondió indicando su destino?
  // Solo se activa la búsqueda inteligente al responder al primer mensaje
  const hasPassengerResponded = useMemo(() => {
    return chatMessages.some((m) => m.sender === 'PASSENGER');
  }, [chatMessages]);

  const isFirstDestinationResponse = isPassenger && !hasPassengerResponded;

  // Lugares sugeridos en Riberalta en tiempo real según lo que escribe el pasajero
  const matchedPlaces = useMemo(() => {
    if (!isFirstDestinationResponse || !inputMessage.trim()) return [];
    return searchRiberaltaLocations(inputMessage);
  }, [isFirstDestinationResponse, inputMessage]);

  if (!isNegotiating || !activeTrip) return null;

  // 1. Seleccionar un lugar reconocido con coordenadas exactas de Riberalta
  const handleSelectPlaceDestination = (place: RiberaltaPlace) => {
    if (!rideId) return;
    haptics.selection();
    setShowPlaceSuggestions(false);
    setInputMessage('');

    const destObj = {
      id: place.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      isCustom: false,
    };

    // Actualizar destino en viaje y store
    setDestination(destObj);
    setActiveTrip({
      ...activeTrip,
      destination: destObj,
    });
    apiService.updateRideDestination(rideId, destObj);

    // Enviar mensaje en chat
    apiService.sendMessage(rideId, 'PASSENGER', `📍 Voy a: ${place.name} (${place.address})`);
  };

  // 2. Marcar como destino personalizado (no encontrado o coordinar en persona) -> NO traza ruta en mapa
  const handleSelectCustomDestination = (customName: string) => {
    if (!rideId) return;
    haptics.selection();
    setShowPlaceSuggestions(false);
    setInputMessage('');

    const customDest = createCustomDestination(customName);

    // Actualizar destino en viaje y store
    setDestination(customDest);
    setActiveTrip({
      ...activeTrip,
      destination: customDest,
    });
    apiService.updateRideDestination(rideId, customDest);

    // Enviar mensaje en chat
    apiService.sendMessage(
      rideId, 
      'PASSENGER', 
      `📍 Destino personalizado: "${customDest.name}" (Coordinar en persona)`
    );
  };

  // 3. Enviar mensaje regular (o procesar destino inicial si aún no se respondió)
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !rideId) return;

    if (isFirstDestinationResponse) {
      // Si aún no ha respondido al destino: buscar coincidencia o marcar personalizado
      const matches = searchRiberaltaLocations(text);
      if (matches.length > 0) {
        handleSelectPlaceDestination(matches[0]);
      } else {
        handleSelectCustomDestination(text);
      }
      return;
    }

    // Mensaje de texto conversacional estándar
    haptics.selection();
    setInputMessage('');
    setShowPlaceSuggestions(false);
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
              <span>Coordinen el destino y el pasaje</span>
            </p>
            <p className="text-[10px] text-text-secondary">
              {isPassenger 
                ? 'Indica a qué lugar o calle vas. Si está en el mapa se trazará la ruta; si no, será destino personalizado.' 
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
          {/* Chips iniciales de destinos populares (solo en primera respuesta del pasajero) */}
          {isFirstDestinationResponse && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gold-primary" />
                Destinos frecuentes en Riberalta:
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {POPULAR_QUICK_PLACES.map((placeName) => {
                  const placeMatch = RIBERALTA_PLACES.find(p => p.name.includes(placeName));
                  return (
                    <button
                      key={placeName}
                      type="button"
                      onClick={() => {
                        if (placeMatch) {
                          handleSelectPlaceDestination(placeMatch);
                        } else {
                          handleSelectCustomDestination(placeName);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-gold-primary/30 text-white font-bold text-[11px] whitespace-nowrap active:scale-95 transition shrink-0"
                    >
                      📍 {placeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input de texto con Autocompletado de Destinos (solo en primer mensaje) */}
          <div className="relative">
            {/* Popover con sugerencias de lugares en tiempo real */}
            {isFirstDestinationResponse && showPlaceSuggestions && inputMessage.trim().length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-[#0A0D12]/98 border-2 border-gold-primary/50 rounded-2xl shadow-2xl backdrop-blur-2xl max-h-52 overflow-y-auto space-y-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-black text-gold-primary uppercase tracking-wider flex items-center justify-between border-b border-border-custom pb-1.5 mb-1">
                  <span>Lugares en Riberalta</span>
                  <span>Toca para elegir</span>
                </div>

                {matchedPlaces.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectPlaceDestination(place)}
                    className="w-full text-left p-2 rounded-xl bg-surface-2 hover:bg-gold-primary/10 hover:border-gold-primary/40 border border-transparent transition flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gold-primary/20 text-gold-primary flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-gold-primary transition">{place.name}</p>
                        <p className="text-[10px] text-text-secondary">{place.address}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
                  </button>
                ))}

                {/* Opción Destino Personalizado si no está en la base de datos */}
                <button
                  type="button"
                  onClick={() => handleSelectCustomDestination(inputMessage)}
                  className="w-full text-left p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-2 text-amber-300 active:scale-[0.99]"
                >
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white">Destino personalizado</p>
                    <p className="text-[10px] text-amber-300">
                      Marcar &quot;{inputMessage.trim()}&quot; (Coordinar en persona)
                    </p>
                  </div>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  if (isFirstDestinationResponse) {
                    setShowPlaceSuggestions(true);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                onFocus={() => {
                  if (isFirstDestinationResponse) setShowPlaceSuggestions(true);
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 200);
                }}
                placeholder={
                  isFirstDestinationResponse 
                    ? '¿A dónde vas? (ej: Los Almendros, Hospital)...' 
                    : isPassenger 
                    ? 'Escribe tu mensaje al conductor...' 
                    : 'Escribe tu respuesta camba...'
                }
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
          </div>

          {/* BOTÓN INFERIOR: EXCLUSIVO DEL CONDUCTOR */}
          {!isPassenger ? (
            <button
              onClick={handleAcceptFareAndStart}
              className="w-full py-3.5 bg-gradient-to-r from-gold-primary to-amber-400 text-background rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Aceptar e Iniciar Viaje por {localFare} BOB</span>
            </button>
          ) : (
            <div className="py-2.5 px-3 rounded-2xl bg-surface-2/80 border border-border-custom text-center text-xs text-text-secondary flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-primary animate-ping" />
              <span>Esperando que el conductor acepte e inicie el viaje ({localFare} BOB)...</span>
            </div>
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
