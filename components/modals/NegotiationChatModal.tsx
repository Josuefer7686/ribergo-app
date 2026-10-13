'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  Send, Sparkles, MapPin, DollarSign, Check, X, Shield, 
  MessageSquare, Bike, User, ChevronRight, ThumbsUp, Flame, AlertCircle
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const rideId = activeTrip?.id;
  const currentFare = activeTrip?.proposedPrice || activeTrip?.price || 10;
  const offeredBy = activeTrip?.priceOfferedBy;
  const isOfferFromOther = offeredBy && ((isPassenger && offeredBy === 'DRIVER') || (!isPassenger && offeredBy === 'PASSENGER'));

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

  // Mantener scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isNegotiating || !activeTrip) return null;

  // Enviar mensaje de texto
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !rideId) return;

    haptics.selection();
    setInputMessage('');

    await apiService.sendMessage(rideId, isPassenger ? 'PASSENGER' : 'DRIVER', text);

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

  // Proponer tarifa
  const handleProposeFare = async (newPrice: number) => {
    if (!rideId) return;
    haptics.heavy();

    await apiService.proposeRideFare(
      rideId, 
      newPrice, 
      isPassenger ? 'PASSENGER' : 'DRIVER',
      selectedDestinationName || activeTrip.destination.name
    );

    const senderRole = isPassenger ? 'PASSENGER' : 'DRIVER';
    const msgText = isPassenger 
      ? `Te ofrezco ${newPrice} BOB pariente, ¿le metemos?` 
      : `Por la distancia hasta allá te sale ${newPrice} BOB camba, ¿trato hecho?`;

    await apiService.sendMessage(rideId, senderRole, msgText);
  };

  // Aceptar la tarifa y cerrar negociación
  const handleAcceptFareAndStart = async () => {
    if (!rideId) return;
    haptics.success();
    audio.driverTripAccepted();

    const finalPrice = activeTrip.proposedPrice || activeTrip.price || 10;
    const finalDest = selectedDestinationName || activeTrip.destination.name || 'Destino acordado';

    await apiService.confirmRideFare(rideId, finalPrice, finalDest);
    await apiService.sendMessage(
      rideId, 
      isPassenger ? 'PASSENGER' : 'DRIVER', 
      `¡Trato hecho camba! Nos vemos en ${finalPrice} BOB. Voy en camino.`
    );

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
  };

  // Cancelar negociación
  const handleRejectOrCancel = async () => {
    if (!rideId) return;
    haptics.error();

    if (isPassenger) {
      await apiService.cancelRideNegotiation(rideId);
      setPassengerState('SEARCHING_DRIVER');
    } else {
      await apiService.cancelRideNegotiation(rideId);
      setActiveTrip(null);
      setDriverState('ONLINE');
    }
  };

  const otherPersonName = isPassenger 
    ? (activeTrip.driver?.name || 'Mototaxista Riberalta') 
    : (activeTrip.passengerName || 'Pasajero');

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl flex flex-col justify-between max-w-md mx-auto"
    >
      {/* HEADER NEGOCIACIÓN */}
      <div className="pt-safe px-4 pt-4 pb-3 bg-surface border-b border-border-custom shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gold-primary/20 border-2 border-gold-primary/50 flex items-center justify-center text-gold-primary shadow-lg shadow-gold-primary/10">
              {isPassenger ? <Bike className="w-6 h-6 animate-pulse" /> : <User className="w-6 h-6" />}
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

        {/* BARRA SUPERIOR DE TARIFA DINÁMICA */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-surface-2 via-surface to-surface-2 border border-gold-primary/40 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-text-secondary block">
                Tarifa propuesta
              </span>
              <span className="text-lg font-black text-gold-primary leading-none">
                {currentFare} <span className="text-xs font-bold text-white">BOB</span>
              </span>
            </div>
          </div>

          {/* Botón de Aceptar Trato o Proponer */}
          {isOfferFromOther ? (
            <button
              onClick={handleAcceptFareAndStart}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 active:scale-95 animate-bounce"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Aceptar {currentFare} Bs</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleProposeFare(Math.max(5, currentFare - 2))}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-2 border border-border-custom text-white font-black text-sm flex items-center justify-center transition active:scale-95"
                title="Bajar 2 Bs"
              >
                -2
              </button>
              <button
                onClick={() => handleProposeFare(currentFare + 2)}
                className="px-2.5 py-1.5 rounded-xl bg-gold-primary/20 hover:bg-gold-primary/30 border border-gold-primary/50 text-gold-primary font-black text-xs flex items-center gap-1 transition active:scale-95"
                title="Subir 2 Bs"
              >
                +2 Bs
              </button>
              <button
                onClick={() => handleProposeFare(currentFare + 5)}
                className="px-2.5 py-1.5 rounded-xl bg-gold-primary hover:bg-gold-light text-background font-black text-xs flex items-center gap-1 transition active:scale-95 shadow-md shadow-gold-primary/20"
                title="Subir 5 Bs"
              >
                +5 Bs
              </button>
            </div>
          )}
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
      <div className="p-3 bg-surface border-t border-border-custom space-y-2.5 pb-safe">
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
            placeholder={isPassenger ? 'Escribe a dónde vas (ej: Final Jacarandá)...' : 'Escribe tu respuesta camba...'}
            className="flex-1 bg-surface-2 border border-border-custom rounded-2xl py-3 px-4 text-xs text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary transition"
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
          <span>Confirmar e Iniciar Viaje por {currentFare} BOB</span>
        </button>
      </div>
    </motion.div>
  );
};
