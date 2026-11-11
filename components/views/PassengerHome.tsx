'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, ServiceType } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { MapView } from '@/components/map/MapView';
import { DESTINATION_IN_PERSON, DestinationOption } from '@/services/mockData';
import { DestinationSearch } from '@/components/passenger/DestinationSearch';
import { ServicePicker } from '@/components/passenger/ServicePicker';
import { OfferStepper } from '@/components/passenger/OfferStepper';
import { BottomSheet } from '@/components/passenger/BottomSheet';
import { SafetyBanner } from '@/components/passenger/SafetyBanner';
import { 
  Bike, Navigation, Search, MapPin, Star, MessageSquare, X, Check, Clock, DollarSign, Shield, ChevronRight, AlertCircle,
  QrCode, Sparkles, TrendingUp, Flame, Compass, ShieldCheck, Bell, Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { TerminalView } from '@/components/terminal/TerminalView';
import { NegotiationChatModal } from '@/components/modals/NegotiationChatModal';
import { Wrench, Bus, AlertTriangle, Info } from 'lucide-react';
import { VehicleIcon } from '@/components/ui/VehicleIcon';
import { useAutoLocation } from '@/hooks/useAutoLocation';
import { calculateDistanceMeters, formatDistance, getBearingDirectionLabel } from '@/utils/geo';
import { DriverData } from '@/services/mockData';

export const PassengerHome = () => {
  const { 
    user,
    currentLocation, setCurrentLocation,
    destination, setDestination,
    passengerState, setPassengerState,
    assignedDriver, setAssignedDriver,
    activeTrip, setActiveTrip,
    setActiveTab, addTripToHistory, resetRide,
    preferences,
    activeTransportMode, setActiveTransportMode,
    urbanServiceType, setUrbanServiceType,
    onlineDrivers, selectedDriverId, setSelectedDriverId,
    triggerMapRecenter
  } = useAppStore();

  const { locationError, requestLocation } = useAutoLocation();

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [customOffer, setCustomOffer] = useState<number | null>(null);
  const [infoBubble, setInfoBubble] = useState<'MOTOCAR' | 'TAXI_AUTO' | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'QR'>('CASH');
  const [qrPaymentSent, setQrPaymentSent] = useState(false);

  // References to prevent infinite state re-render loops
  const activeTripRef = useRef(activeTrip);
  const assignedDriverRef = useRef(assignedDriver);
  const passengerStateRef = useRef(passengerState);

  useEffect(() => {
    activeTripRef.current = activeTrip;
    assignedDriverRef.current = assignedDriver;
    passengerStateRef.current = passengerState;
  }, [activeTrip, assignedDriver, passengerState]);

  // Default fare calculation based on service type:
  // MOTOTAXI: 10 BOB
  // MOTOCAR: 50 BOB (Carga, fletes y traslados pesados)
  // TAXI_AUTO: 35 BOB (Auto taxi cómodo)
  // REMOLCADA: 15 BOB (Auxilio mecánico / remolque con pie a taller)
  const getBaseFare = (st: ServiceType) => {
    switch (st) {
      case 'MOTOCAR': return 50;
      case 'TAXI_AUTO': return 35;
      case 'REMOLCADA': return 15;
      case 'MOTOTAXI':
      default: return 10;
    }
  };
  const baseFare = getBaseFare(urbanServiceType);
  const currentOfferFare = customOffer !== null ? customOffer : baseFare;

  // Oferta en vivo mientras se busca conductor: se ve al instante y los conductores
  // la reciben con un pequeño retraso (1 sola escritura tras terminar de pulsar).
  const offerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchingOffer = activeTrip?.price ?? currentOfferFare;

  const handleOfferChange = (price: number) => {
    const tripId = activeTripRef.current?.id;
    if (!tripId) return;
    setActiveTrip({ ...(activeTripRef.current as NonNullable<typeof activeTrip>), price, proposedPrice: price });
    if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
    offerTimerRef.current = setTimeout(() => {
      offerTimerRef.current = null;
      apiService.updateRideOffer(tripId, price);
    }, 350);
  };

  useEffect(() => () => {
    if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
  }, []);

  // Destino escrito a mano: al aceptar un conductor se le envía solo por el chat.
  useEffect(() => {
    const trip = activeTrip;
    if (passengerState !== 'DRIVER_FOUND' || !trip?.id || !trip.destination?.isCustom) return;
    const key = `ribergo_custom_dest_sent_${trip.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    apiService.sendMessage(trip.id, 'PASSENGER', `📍 Mi destino: ${trip.destination.name}`);
  }, [passengerState, activeTrip?.id, activeTrip?.destination?.isCustom, activeTrip?.destination?.name]);

  // Request GPS location on initial load or button tap
  const handleFetchLocation = () => {
    haptics.selection();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ribergo:recenter_map'));
    }
    triggerMapRecenter();
    requestLocation();
  };

  // Trigger Mototaxi / Motocar / Taxi Auto / Remolcada Booking Flow DIRECTLY
  const handleStartBooking = async () => {
    haptics.heavy();
    audio.passengerRideRequested();
    if (!currentLocation) {
      handleFetchLocation();
    }
    
    // Iniciar búsqueda directamente (Radar)
    setPassengerState('SEARCHING_DRIVER');

    const pickupLoc = currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Mi Ubicación' };
    const destLoc = { lat: -11.0061, lng: -66.0747, name: 'Acordar en chat / en persona' };
    const passengerId = user?.id || 'usr-anon';
    const passengerName = user?.name || 'Pasajero RiberGO';
    const initialPrice = getBaseFare(urbanServiceType);

    try {
      const trip = await apiService.requestRide(
        pickupLoc,
        destLoc,
        initialPrice,
        passengerId,
        passengerName,
        'CASH',
        user?.phone || '+591 70000000',
        urbanServiceType
      );
      setActiveTrip(trip);
    } catch (err) {
      console.error('Request ride error:', err);
    }
  };

  // Only real online drivers (100% real, no bots/mocks)
  const selectedDriver: DriverData | null = 
    onlineDrivers.find((d) => d.id === selectedDriverId) || null;


  // Destination search handlers
  const handlePickDestination = (dest: DestinationOption) => {
    haptics.impact();
    setDestination({ lat: dest.lat, lng: dest.lng, name: dest.name, address: dest.address, isCustom: dest.custom === true });
  };

  const handleClearDestination = () => {
    setDestination(null);
    if (passengerState === 'CONFIRMING') setPassengerState('IDLE');
  };

  const handleGoToDestination = () => {
    if (!destination) return;
    if (destination.name === DESTINATION_IN_PERSON.name) {
      handleStartBooking();
      return;
    }
    setCustomOffer(null);
    setPassengerState('CONFIRMING');
  };

  const handleChangeDestination = () => {
    haptics.selection();
    setPassengerState('IDLE');
  };

  // Listen to real-time updates for active trip (No infinite loop)
  useEffect(() => {
    const tripId = activeTrip?.id;
    if (!tripId) return;

    const unsubscribe = apiService.subscribeToRide(tripId, (rideData) => {
      if (!rideData) return;

      if (rideData.status === 'NEGOTIATING') {
        const driverInfo = {
          id: rideData.driverId,
          name: rideData.driverName || 'Mototaxista RiberGO',
          phone: rideData.driverPhone || '+591 70000000',
          rating: typeof rideData.driverRating === 'number' ? rideData.driverRating : null,
          trips: typeof rideData.driver?.trips === 'number' ? rideData.driver.trips : 0,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          motorcycle: rideData.motorcycle || 'Honda Wave 110',
          plate: rideData.plate || 'RBT-100',
          currentLocation: rideData.pickup || currentLocation || { lat: -11.0061, lng: -66.0747 },
        };
        if (assignedDriverRef.current?.id !== driverInfo.id) {
          setAssignedDriver(driverInfo);
        }
        if (passengerStateRef.current !== 'NEGOTIATING') {
          haptics.heavy();
          audio.passengerDriverFound();
          setPassengerState('NEGOTIATING');
        }
        setActiveTrip({
          ...(activeTripRef.current || {}),
          ...rideData,
          driver: driverInfo,
        });
      } else if (rideData.driverId && rideData.status === 'GOING_TO_PASSENGER') {
        const driverInfo = {
          id: rideData.driverId,
          name: rideData.driverName || 'Mototaxista RiberGO',
          phone: rideData.driverPhone || '+591 70000000',
          rating: typeof rideData.driverRating === 'number' ? rideData.driverRating : null,
          trips: typeof rideData.driver?.trips === 'number' ? rideData.driver.trips : 0,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          motorcycle: rideData.motorcycle || 'Honda Wave 110',
          plate: rideData.plate || 'RBT-100',
          currentLocation: rideData.pickup || currentLocation || { lat: -11.0061, lng: -66.0747 },
        };
        if (assignedDriverRef.current?.id !== driverInfo.id) {
          setAssignedDriver(driverInfo);
        }
        if (passengerStateRef.current !== 'DRIVER_FOUND') {
          haptics.success();
          audio.passengerDriverFound();
          setPassengerState('DRIVER_FOUND');
        }
        setActiveTrip({
          ...(activeTripRef.current || {}),
          ...rideData,
          driver: driverInfo,
        });
      } else if (rideData.status === 'SEARCHING_DRIVER') {
        if (passengerStateRef.current !== 'SEARCHING_DRIVER') {
          setPassengerState('SEARCHING_DRIVER');
        }
      } else if (rideData.status === 'TRIP_STARTED') {
        if (passengerStateRef.current !== 'TRIP_STARTED') {
          setPassengerState('TRIP_STARTED');
        }
        setActiveTrip({
          ...(activeTripRef.current || {}),
          ...rideData,
        });
      } else if (rideData.status === 'COMPLETED') {
        if (passengerStateRef.current !== 'TRIP_COMPLETED') {
          setPassengerState('TRIP_COMPLETED');
        }
        setActiveTrip({
          ...(activeTripRef.current || {}),
          ...rideData,
        });
      } else if (rideData.status === 'CANCELLED') {
        haptics.notification();
        resetRide();
      }
    });

    return () => unsubscribe();
  }, [activeTrip?.id, setActiveTrip, setAssignedDriver, setPassengerState, resetRide, currentLocation]);

  // Confirm Mototaxi
  const handleConfirmBooking = async () => {
    haptics.notification();
    setPassengerState('SEARCHING_DRIVER');

    const pickupLoc = currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Mi Ubicación' };
    const destLoc = destination || { lat: -11.0061, lng: -66.0747, name: 'Acordar en chat / en persona' };
    const passengerId = user?.id || 'usr-anon';
    const passengerName = user?.name || 'Pasajero RiberGO';
    const finalFare = currentOfferFare;

    try {
      const trip = await apiService.requestRide(
        pickupLoc, 
        destLoc, 
        finalFare, 
        passengerId, 
        passengerName,
        selectedPaymentMethod,
        user?.phone || '+591 70000000',
        urbanServiceType
      );
      setActiveTrip(trip);
    } catch (err) {
      console.error('Request ride error:', err);
    }
  };

  // Passenger notifies driver that QR was transferred
  const handleNotifyQrPaid = async () => {
    haptics.success();
    audio.passengerRideRequested();
    setQrPaymentSent(true);
    if (activeTrip?.id) {
      await apiService.submitRideQrPayment(activeTrip.id);
      setActiveTrip({
        ...activeTrip,
        paymentStatus: 'WAITING_DRIVER_CONFIRM',
      });
    }
  };

  // Cancel active ride (passenger only cancels/exits; driver controls start/finish)
  const handleCancelActiveRide = async () => {
    haptics.notification();
    if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
    const tripId = activeTrip?.id;
    resetRide();
    if (tripId) {
      try {
        await apiService.cancelRideRequest(tripId);
      } catch (err) {
        console.error('Error cancelling ride:', err);
      }
    }
  };

  const handleFinishTrip = async (skipRating = false) => {
    haptics.success();
    audio.passengerTripFinished();
    const effectiveDriverId = assignedDriver?.id || activeTrip?.driver?.id || (activeTrip as any)?.driverId || '';
    const ratingToSend = skipRating ? 0 : rating;

    if (activeTrip?.id) {
      await apiService.submitPassengerRating(activeTrip.id, {
        driverId: effectiveDriverId,
        rating: ratingToSend,
        comment: !skipRating && reviewText.trim() ? reviewText.trim() : undefined,
        passengerName: user?.name || 'Pasajero',
      });
    }

    if (activeTrip && assignedDriver) {
      addTripToHistory({
        id: activeTrip.id,
        date: 'Hoy',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pickup: currentLocation?.name || 'Mi Ubicación',
        destination: destination?.name || 'Destino',
        price: activeTrip.price,
        driverName: assignedDriver.name,
        driverRating: ratingToSend > 0 ? ratingToSend : 5,
        motorcycle: assignedDriver.motorcycle,
        status: 'COMPLETED',
        group: 'TODAY',
      });
    }

    resetRide();
  };

  const isIdle =
    passengerState === 'IDLE' || passengerState === 'LOCATION_READY' || passengerState === 'LOCATION_LOADING';
  const isPlanning = isIdle || passengerState === 'CONFIRMING';

  const gpsButton = (
    <button
      onClick={handleFetchLocation}
      className="pointer-events-auto w-14 h-14 rounded-full bg-background/90 border border-white/20 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.8)] flex items-center justify-center transition active:scale-90"
      title="Centrar en mi ubicación"
      aria-label="Centrar en mi ubicación"
    >
      <Crosshair className="w-6 h-6" />
    </button>
  );

  const isTerminalMode = activeTransportMode === 'TERMINAL_INTERPROVINCIAL';

  if (isTerminalMode) {
    return (
      <div className="w-full h-full relative flex flex-col justify-between overflow-hidden bg-background">
        {/* Mode Switcher Bar at top of Terminal */}
        <div className="relative z-20 pt-safe px-4 pt-3 pointer-events-auto max-w-sm mx-auto w-full">
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-surface/90 border border-gold-primary/40 backdrop-blur-md shadow-xl text-xs font-black">
            <button
              onClick={() => {
                haptics.selection();
                setActiveTransportMode('URBAN_MOTOTAXI');
              }}
              className="py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-text-secondary hover:text-white"
            >
              <Bike className="w-4 h-4 text-gold-primary" />
              <span>Mototaxi Urbana</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                setActiveTransportMode('TERMINAL_INTERPROVINCIAL');
              }}
              className="py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 bg-gold-primary text-background shadow-md shadow-gold-primary/20"
            >
              <Bus className="w-4 h-4" />
              <span>Terminal Interprovincial</span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full overflow-hidden">
          <TerminalView />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex flex-col justify-between overflow-hidden">
      {/* Background Leaflet Map */}
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>

      {/* Top: marca, notificaciones y buscador de destino */}
      <div className="relative z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] pointer-events-none space-y-3 max-w-[430px] mx-auto w-full">
        <div className="flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0 py-1.5 pl-1.5 pr-4 rounded-2xl bg-gold-primary shadow-[0_8px_20px_-8px_rgba(255,198,26,0.6)]">
            <img src="/logo.png" alt="" className="w-10 h-10 object-contain shrink-0 rounded-xl" />
            <div className="min-w-0 leading-none">
              <p className="font-display text-[24px] font-extrabold italic tracking-tight text-background">
                RIBER GO
              </p>
              <p className="text-xs font-semibold text-background/80 mt-1 truncate">Tu transporte, más cerca</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                haptics.selection();
                setActiveTransportMode('TERMINAL_INTERPROVINCIAL');
              }}
              aria-label="Terminal interprovincial"
              title="Terminal interprovincial"
              className="w-11 h-11 rounded-full bg-surface border border-white/10 flex items-center justify-center text-gold-primary active:scale-95 transition"
            >
              <Bus className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                haptics.selection();
                setActiveTab('MESSAGES');
              }}
              aria-label="Notificaciones y mensajes"
              className="w-11 h-11 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white active:scale-95 transition"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isPlanning && (
          <DestinationSearch
            selected={destination}
            onSelect={handlePickDestination}
            onClear={handleClearDestination}
            onGo={handleGoToDestination}
          />
        )}

        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-surface-2 border border-gold-primary/30 text-sm text-gold-light flex items-center gap-2 pointer-events-auto"
          >
            <AlertCircle className="w-4 h-4 text-gold-primary shrink-0" />
            <span>{locationError}</span>
          </motion.div>
        )}
      </div>

      {/* Botón de recentrar (fuera del panel solo cuando no hay panel arrastrable) */}
      {!isPlanning && (
        <div className="relative z-20 px-4 w-full max-w-[430px] mx-auto flex justify-end pointer-events-none mb-3 mt-auto">
          <div className="pointer-events-auto">{gpsButton}</div>
        </div>
      )}

      {/* Bottom Sheet Panels */}
      <div className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] w-full max-w-[430px] mx-auto pointer-events-none">
        <AnimatePresence mode="wait">
          {/* STATE 1: IDLE / LOCATION_READY */}
          {isIdle && (
            <BottomSheet
              key="idle"
              floating={gpsButton}
              title={<h2 className="font-display text-xl font-extrabold text-white whitespace-nowrap">Servicios disponibles</h2>}
              footer={
                <button
                  onClick={handleStartBooking}
                  className="w-full h-14 rounded-2xl bg-gold-primary text-background font-black text-base flex items-center justify-center gap-2.5 shadow-[0_10px_24px_-8px_rgba(255,198,26,0.55)] transition active:scale-[0.98]"
                >
                  <VehicleIcon type={urbanServiceType} className="w-5 h-5 stroke-[2.4]" />
                  <span>
                    {urbanServiceType === 'REMOLCADA'
                      ? 'Pedir auxilio / remolcada'
                      : urbanServiceType === 'MOTOCAR'
                      ? 'Pedir Motocar'
                      : urbanServiceType === 'TAXI_AUTO'
                      ? 'Pedir Taxi Auto'
                      : 'Pedir Mototaxi'}
                  </span>
                </button>
              }
            >
              <ServicePicker
                value={urbanServiceType}
                onChange={(s) => setUrbanServiceType(s)}
                getFare={getBaseFare}
              />

              {/* REMOLCADA BANNER NOTICE */}
              {urbanServiceType === 'REMOLCADA' && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Servicio de Auxilio Mecánico</p>
                    <p className="text-xs text-amber-200/80 leading-snug">
                      Un mototaxista vendrá a tu ubicación y remolcará tu motocicleta con el pie hasta tu casa o taller en Riberalta.
                    </p>
                  </div>
                </div>
              )}

              <SafetyBanner />

              {(urbanServiceType === 'MOTOTAXI' || urbanServiceType === 'REMOLCADA') && (
                <button
                  onClick={() => {
                    haptics.selection();
                    setUrbanServiceType(urbanServiceType === 'REMOLCADA' ? 'MOTOTAXI' : 'REMOLCADA');
                  }}
                  className="w-full min-h-11 text-sm font-semibold text-text-secondary flex items-center justify-center gap-2 active:text-white transition-colors"
                >
                  <Wrench className="w-4 h-4 text-gold-primary" />
                  <span>{urbanServiceType === 'REMOLCADA' ? 'Volver a pedir un viaje' : '¿Moto varada? Pedir auxilio'}</span>
                </button>
              )}
            </BottomSheet>
          )}

          {/* STATE 2: CONFIRMING (destino elegido en el buscador) */}
          {passengerState === 'CONFIRMING' && destination && (
            <BottomSheet
              key="confirming"
              floating={gpsButton}
              title={
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-text-secondary">Vas a</span>
                    <span className="block font-display text-lg font-extrabold text-white leading-tight truncate">{destination.name}</span>
                  </span>
                  <span className="shrink-0 font-display text-lg font-extrabold text-gold-primary tabular-nums">Bs {currentOfferFare}</span>
                </span>
              }
              footer={
                <>
                  <button
                    onClick={handleConfirmBooking}
                    className="w-full h-14 rounded-2xl bg-gold-primary text-background font-black text-base flex items-center justify-center gap-2.5 shadow-[0_10px_24px_-8px_rgba(255,198,26,0.55)] transition active:scale-[0.98]"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Confirmar y pedir</span>
                  </button>
                  <button
                    onClick={handleChangeDestination}
                    className="w-full min-h-11 text-sm font-semibold text-text-secondary active:text-white transition-colors"
                  >
                    Cambiar destino
                  </button>
                </>
              }
            >
              {destination.address && (
                <p className="text-sm text-text-secondary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold-primary shrink-0" />
                  <span className="truncate">{destination.address}</span>
                </p>
              )}

              <ServicePicker
                value={urbanServiceType}
                onChange={(s) => { setCustomOffer(null); setUrbanServiceType(s); }}
                getFare={getBaseFare}
              />

              <div className="space-y-2">
                <OfferStepper value={currentOfferFare} onChange={setCustomOffer} caption="Tu oferta" />
                <p className="text-center text-xs text-text-secondary">
                  Tú pones el precio. Podrás subirlo mientras buscamos conductor.
                </p>
              </div>

              <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-2 border border-white/10">
                {([['CASH', 'Efectivo'], ['QR', 'QR']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={selectedPaymentMethod === id}
                    onClick={() => { haptics.selection(); setSelectedPaymentMethod(id); }}
                    className={`h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                      selectedPaymentMethod === id ? 'bg-gold-primary text-background' : 'text-text-secondary'
                    }`}
                  >
                    {id === 'QR' ? <QrCode className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    {label}
                  </button>
                ))}
              </div>
            </BottomSheet>
          )}

          {/* STATE 4: SEARCHING DRIVER (Radar Animation) */}
          {passengerState === 'SEARCHING_DRIVER' && (
            <motion.div
              key="searching"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl text-center space-y-4 max-h-[calc(100dvh-16rem)] overflow-y-auto overscroll-contain no-scrollbar pointer-events-auto"
            >
              <OfferStepper value={searchingOffer} onChange={handleOfferChange} radar caption="Ofreces" />

              <div>
                <h3 className="font-display text-lg font-extrabold text-white">
                  {urbanServiceType === 'REMOLCADA'
                    ? 'Buscando auxilio…'
                    : urbanServiceType === 'MOTOCAR'
                    ? 'Buscando motocar…'
                    : urbanServiceType === 'TAXI_AUTO'
                    ? 'Buscando taxi auto…'
                    : 'Buscando mototaxi…'}
                </h3>
                <p className="text-sm text-text-secondary mt-1 leading-snug">
                  Los conductores ven tu oferta en vivo. Si tarda, súbela un poco para que te acepten más rápido.
                </p>
                {activeTrip?.destination?.name && activeTrip.destination.name !== DESTINATION_IN_PERSON.name && (
                  <p className="text-sm font-semibold text-white mt-2 flex items-center justify-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gold-primary shrink-0" />
                    <span className="truncate">{activeTrip.destination.name}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  haptics.selection();
                  if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
                  const tripId = activeTrip?.id;
                  // 1. Optimistic UI: cerrar INMEDIATAMENTE (0ms)
                  setActiveTrip(null);
                  setPassengerState('IDLE');
                  // 2. Limpieza en Firestore en segundo plano
                  if (tripId) {
                    apiService.cancelRideRequest(tripId);
                  }
                }}
                className="min-h-11 px-5 rounded-xl bg-surface-2 text-sm font-semibold text-text-secondary hover:text-white transition active:scale-95"
              >
                Cancelar solicitud
              </button>
            </motion.div>
          )}

          {/* STATE 5: DRIVER FOUND */}
          {passengerState === 'DRIVER_FOUND' && assignedDriver && (
            <motion.div
              key="driver_found"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4 max-h-[calc(100dvh-16rem)] overflow-y-auto overscroll-contain no-scrollbar pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <span className="text-xs font-bold text-gold-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gold-primary animate-ping" />
                  {activeTrip?.serviceType === 'REMOLCADA' 
                    ? '¡Auxilio en camino!' 
                    : activeTrip?.serviceType === 'MOTOCAR' || assignedDriver.vehicleType === 'MOTOCAR'
                    ? '¡Motocar encontrado!' 
                    : activeTrip?.serviceType === 'TAXI_AUTO' || assignedDriver.vehicleType === 'TAXI_AUTO'
                    ? '¡Taxi auto encontrado!'
                    : '¡Mototaxi encontrado!'}
                </span>
                <span className="text-xs font-semibold text-text-secondary">Llega en ~2 min</span>
              </div>

              {/* Driver Details Card */}
              <div className="flex items-center gap-3.5">
                <img
                  src={assignedDriver.avatar}
                  alt={assignedDriver.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-gold-primary/40 shadow-md"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{assignedDriver.name}</h4>
                    <div className="flex items-center gap-1 text-gold-primary text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-gold-primary" />
                      <span>{assignedDriver.rating ? Number(assignedDriver.rating).toFixed(1) : 'Nuevo ✨'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{assignedDriver.trips} viajes completados</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 text-[10px] font-semibold text-white flex items-center gap-1.5">
                      <VehicleIcon type={assignedDriver.vehicleType || 'MOTOTAXI'} className="w-3.5 h-3.5 text-gold-primary" />
                      <span>{assignedDriver.vehicleType === 'MOTOCAR' ? 'Motocar' : assignedDriver.vehicleType === 'TAXI_AUTO' ? 'Taxi Auto' : 'Moto'}</span>
                      {assignedDriver.motorcycle ? ` • ${assignedDriver.motorcycle}` : ''}
                    </span>
                    {assignedDriver.plate && (
                      <span className="px-2 py-0.5 rounded-md bg-gold-primary/20 text-[10px] font-bold text-gold-primary border border-gold-primary/30">
                        {assignedDriver.plate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Driver En Route Status Notice */}
              <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
                activeTrip?.serviceType === 'REMOLCADA'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-gold-primary/10 border-gold-primary/20 text-gold-primary'
              }`}>
                <VehicleIcon 
                  type={activeTrip?.serviceType || 'MOTOTAXI'} 
                  className={`w-4 h-4 shrink-0 animate-bounce ${activeTrip?.serviceType === 'REMOLCADA' ? 'text-amber-400' : 'text-gold-primary'}`} 
                />
                <span className="font-medium text-[11px] leading-tight">
                  {activeTrip?.serviceType === 'REMOLCADA'
                    ? 'El mototaxista va en camino para auxiliarte y remolcar tu moto. El conductor iniciará el auxilio.'
                    : activeTrip?.serviceType === 'MOTOCAR'
                    ? 'El motocar va en camino a tu ubicación para tu carga o flete. El conductor iniciará el viaje.'
                    : activeTrip?.serviceType === 'TAXI_AUTO'
                    ? 'El taxi auto va en camino a recogerte. El conductor iniciará el viaje.'
                    : 'El conductor va en camino a recogerte. El conductor iniciará el viaje.'}
                </span>
              </div>

              {/* Action Buttons: Chat & Cancel (Passenger can only chat or cancel; driver starts the ride) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setActiveTab('MESSAGES')}
                  className="py-3 bg-surface-2 hover:bg-surface border border-gold-primary/40 text-gold-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensaje</span>
                </button>

                <button
                  onClick={handleCancelActiveRide}
                  className="py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar viaje</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 6: TRIP STARTED */}
          {passengerState === 'TRIP_STARTED' && (
            <motion.div
              key="trip_started"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4 max-h-[calc(100dvh-16rem)] overflow-y-auto overscroll-contain no-scrollbar pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${
                  activeTrip?.serviceType === 'REMOLCADA' ? 'text-amber-400' : 'text-gold-primary'
                }`}>
                  {activeTrip?.serviceType === 'REMOLCADA' ? (
                    <Wrench className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : (
                    <Bike className="w-4 h-4 text-gold-primary animate-pulse" />
                  )}
                  {activeTrip?.serviceType === 'REMOLCADA' ? 'Auxilio / Remolcada en curso' : 'Viaje en curso'}
                </span>
                <span className="text-xs text-text-secondary font-semibold">
                  {activeTrip?.serviceType === 'REMOLCADA' ? 'Hacia destino o taller' : 'En camino al destino'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-2 border border-border-custom text-xs space-y-1.5">
                <p className="text-text-secondary">Destino: <span className="text-white font-bold">{destination?.name}</span></p>
                <p className="text-text-secondary">Tarifa acordada: <span className="text-gold-primary font-bold">{activeTrip?.price || (activeTrip?.serviceType === 'REMOLCADA' ? 15 : 10)} BOB</span></p>
              </div>

              {/* Trip In Progress Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-medium text-[11px] leading-tight">
                  {activeTrip?.serviceType === 'REMOLCADA'
                    ? 'Remolcada en proceso hacia tu destino. Al llegar, el conductor finalizará el servicio.'
                    : 'En viaje con el conductor. Al llegar, el conductor finalizará el viaje.'}
                </span>
              </div>

              {/* Action Buttons: Chat & Cancel/Exit */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setActiveTab('MESSAGES')}
                  className="py-3 bg-surface-2 hover:bg-surface border border-gold-primary/40 text-gold-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensaje</span>
                </button>

                <button
                  onClick={handleCancelActiveRide}
                  className="py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar / Salir</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 7: TRIP COMPLETED */}
          {passengerState === 'TRIP_COMPLETED' && (
            <motion.div
              key="trip_completed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl text-center space-y-4 max-h-[calc(100dvh-16rem)] overflow-y-auto overscroll-contain no-scrollbar pointer-events-auto"
            >
              <div className="w-14 h-14 rounded-full bg-gold-primary/20 border-2 border-gold-primary text-gold-primary flex items-center justify-center mx-auto shadow-lg shadow-gold-primary/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">¡Llegaste!</h3>
                <p className="text-xs text-text-secondary mt-1">Has llegado seguro a tu destino en Riberalta.</p>
              </div>

              {/* Payment Section (CASH vs QR) */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Total a Pagar</span>
                  <span className="text-lg font-black text-gold-primary">{activeTrip?.price || 10} BOB</span>
                </div>

                {activeTrip?.paymentMethod === 'QR' || selectedPaymentMethod === 'QR' ? (
                  <div className="p-3 rounded-xl bg-surface border border-gold-primary/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-gold-primary" />
                        Pago mediante QR Simple
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-primary/20 text-gold-primary font-bold">
                        Riberalta
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div className="p-3 bg-white rounded-xl flex flex-col items-center justify-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=RIBERGO_PAY_${activeTrip?.id || 'DEMO'}_${activeTrip?.price || 10}BOB`}
                        alt="QR Pago RiberGO"
                        className="w-32 h-32 rounded-lg"
                      />
                      <p className="text-[10px] text-zinc-800 font-bold mt-1.5 text-center">
                        Escanea desde tu app bancaria (BNB, BCP, Banco Unión, Fácil)
                      </p>
                    </div>

                    {/* QR Status / Action */}
                    {activeTrip?.paymentStatus === 'CONFIRMED' ? (
                      <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>¡Pago confirmado por el conductor!</span>
                      </div>
                    ) : (activeTrip?.paymentStatus === 'WAITING_DRIVER_CONFIRM' || qrPaymentSent) ? (
                      <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
                        <Clock className="w-4 h-4" />
                        <span>Esperando que el conductor apruebe el pago...</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleNotifyQrPaid}
                        className="w-full py-2.5 bg-gold-primary text-background rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Ya transferí por QR (Avisar al chofer)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-surface border border-border-custom flex items-center justify-between text-xs">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Pago en Efectivo
                    </span>
                    <span className="font-bold text-white">Entrega {activeTrip?.price || 10} BOB al chofer</span>
                  </div>
                )}
              </div>

              {/* Rating selector atractivo e interactivo con estrellas */}
              <div className="p-4 rounded-3xl bg-surface-2 border border-border-custom space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white uppercase tracking-wider">¿Cómo estuvo el servicio?</p>
                  <span className="text-[11px] font-bold text-gold-primary">
                    {rating === 5 && '¡Excelente! 🌟 100 puntos'}
                    {rating === 4 && 'Muy bueno 👍'}
                    {rating === 3 && 'Regular 😐'}
                    {rating === 2 && 'Podría mejorar 👎'}
                    {rating === 1 && 'Malo ⚠️'}
                  </span>
                </div>

                <div className="flex justify-center gap-2.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setRating(star);
                      }}
                      className="p-1 transition-all transform active:scale-125 hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= rating 
                            ? 'fill-gold-primary text-gold-primary drop-shadow-[0_0_8px_rgba(244,197,66,0.6)]' 
                            : 'text-neutral-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Elogios rápidos clickables */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                  {['🏍️ Conducción segura', '😊 Muy amable', '⏱️ Llegó al toque', '✨ Moto limpia', '💰 Tarifa justa'].map((compliment) => (
                    <button
                      key={compliment}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setReviewText(prev => prev ? `${prev}, ${compliment}` : compliment);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-gold-primary/20 border border-gold-primary/30 text-white font-semibold text-[11px] whitespace-nowrap active:scale-95 transition shrink-0"
                    >
                      {compliment}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Escribe un comentario para el conductor (opcional)..."
                  className="w-full bg-surface border border-border-custom rounded-2xl py-2.5 px-3.5 text-xs text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary transition"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleFinishTrip(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-gold-primary via-amber-400 to-yellow-500 text-background rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-gold-primary/25 hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Calificar y Finalizar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFinishTrip(true)}
                  className="w-full py-2 text-xs font-semibold text-text-secondary hover:text-white transition"
                >
                  Omitir calificación
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SUPER ANIMATED DRIVER INSPECTION BUBBLE (Framer Motion) */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 35 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            className="absolute inset-x-4 bottom-4 z-40 max-w-sm mx-auto pointer-events-auto"
          >
            <div className="relative p-4 rounded-3xl bg-surface/95 backdrop-blur-xl border-2 border-gold-primary/60 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(244,197,66,0.25)] text-white overflow-hidden space-y-3">
              
              {/* Gold Shimmer Ambient Aura */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-gold-primary/15 rounded-full blur-2xl pointer-events-none" />

              {/* TOP HEADER: Estado En Línea y Vehículo */}
              <div className="flex items-center justify-between pb-3 border-b border-border-custom/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-gold-primary/20 via-gold-primary/10 to-transparent border border-gold-primary/50 flex items-center justify-center text-gold-primary shadow-inner">
                    <Bike className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gold-primary uppercase tracking-widest block">
                      {selectedDriver.motorcycle ? 'Vehículo Registrado' : 'Conductor'}
                    </span>
                    <h4 className="text-sm font-black text-white tracking-wide">
                      {selectedDriver.motorcycle || 'Mototaxi'}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDriver.plate ? (
                    <span className="px-2.5 py-1 rounded-xl bg-surface-2 border border-gold-primary/40 font-mono text-xs font-black text-gold-light tracking-wider shadow-sm">
                      {selectedDriver.plate}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 tracking-wide flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>En línea</span>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      haptics.selection();
                      setSelectedDriverId(null);
                    }}
                    className="w-7 h-7 rounded-full bg-surface-2 hover:bg-gold-primary/20 text-text-secondary hover:text-white flex items-center justify-center transition active:scale-90"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DRIVER INFO: Avatar con inicial real, Nombre, Clasificación real de su perfil, Viajes reales */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {selectedDriver.avatar && selectedDriver.avatar.startsWith('http') && !selectedDriver.avatar.includes('unsplash') ? (
                    <img 
                      src={selectedDriver.avatar} 
                      alt={selectedDriver.name} 
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-gold-primary/50 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-primary/30 to-surface-2 border-2 border-gold-primary/60 flex items-center justify-center text-gold-primary font-black text-lg shadow-md">
                      {selectedDriver.name ? selectedDriver.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                  )}
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-surface absolute -bottom-0.5 -right-0.5 shadow-sm" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-sm text-white truncate">{selectedDriver.name || 'Conductor'}</h5>
                    <ShieldCheck className="w-4 h-4 text-gold-primary shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1 text-gold-primary font-bold">
                      <Star className="w-3.5 h-3.5 fill-gold-primary" />
                      <span>{selectedDriver.rating ? Number(selectedDriver.rating).toFixed(1) : 'Nuevo ✨'}</span>
                    </span>
                    <span>•</span>
                    <span>{selectedDriver.trips ?? 0} viajes</span>
                  </div>
                </div>
              </div>

              {/* REAL-TIME COMPASS & HEADING DIRECTION BADGE */}
              <div className="p-2.5 rounded-2xl bg-surface-2/90 border border-border-custom flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary shadow-sm">
                    <Compass 
                      className="w-4 h-4 transition-transform duration-500" 
                      style={{ transform: `rotate(${selectedDriver.heading || 0}deg)` }}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block">Rumbo en vivo</span>
                    <span className="font-extrabold text-white text-[11px] flex items-center gap-1">
                      <span>{getBearingDirectionLabel(selectedDriver.heading || 0)}</span>
                      <span className="text-gold-light text-[10px]">({selectedDriver.heading || 0}°)</span>
                      <span className="text-text-secondary text-[10px] font-normal">
                        {selectedDriver.speed && selectedDriver.speed > 0 ? `• ${selectedDriver.speed} km/h` : '• En parada'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-text-secondary block">Distancia</span>
                  <span className="font-black text-gold-primary text-[11px]">
                    {currentLocation 
                      ? formatDistance(calculateDistanceMeters(currentLocation.lat, currentLocation.lng, selectedDriver.currentLocation.lat, selectedDriver.currentLocation.lng))
                      : 'En Riberalta'}
                  </span>
                </div>
              </div>

              {/* STATUS INDICATOR (CONECTADO EN TIEMPO REAL - SIN BOTONES INNECESARIOS) */}
              <div className="py-2.5 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Conductor en línea en tiempo real</span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE NEGOCIACIÓN EN TIEMPO REAL */}
      <NegotiationChatModal />
    </div>
  );
};
