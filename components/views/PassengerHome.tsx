'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { MapView } from '@/components/map/MapView';
import { RIBERALTA_DESTINATIONS, DestinationOption } from '@/services/mockData';
import { 
  Bike, Navigation, Search, MapPin, Star, MessageSquare, X, Check, Clock, DollarSign, Shield, ChevronRight, AlertCircle,
  QrCode, Sparkles, TrendingUp, Flame, Compass, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TerminalView } from '@/components/terminal/TerminalView';
import { NegotiationChatModal } from '@/components/modals/NegotiationChatModal';
import { Wrench, Bus, AlertTriangle } from 'lucide-react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [customOffer, setCustomOffer] = useState<number | null>(null);
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

  // Default fare calculation based on service type
  const baseFare = urbanServiceType === 'REMOLCADA' ? 15 : 10;
  const currentOfferFare = customOffer !== null ? customOffer : baseFare;

  // Request GPS location on initial load or button tap
  const handleFetchLocation = () => {
    haptics.selection();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ribergo:recenter_map'));
    }
    triggerMapRecenter();
    requestLocation();
  };

  // Trigger Mototaxi / Remolcada Booking Flow DIRECTLY
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
    const initialPrice = urbanServiceType === 'REMOLCADA' ? 15 : 10;

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


  // Select Destination
  const handleSelectDestination = (dest: DestinationOption) => {
    haptics.impact();
    setDestination({
      lat: dest.lat,
      lng: dest.lng,
      name: dest.name,
      address: dest.address,
    });
    setPassengerState('CONFIRMING');
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
          rating: rideData.driverRating || 5.0,
          trips: 15,
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
          rating: rideData.driverRating || 5.0,
          trips: 15,
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

  const handleFinishTrip = async () => {
    haptics.success();
    audio.passengerTripFinished();
    if (activeTrip?.id) {
      await apiService.finishTripAndArchive(activeTrip.id, {
        passengerId: user?.id || 'passenger_demo',
        passengerName: user?.name || 'Pasajero',
        passengerPhone: user?.phone || '',
        driverId: assignedDriver?.id || activeTrip.driver?.id || '',
        driverName: assignedDriver?.name || activeTrip.driver?.name || 'Conductor',
        driverPhone: assignedDriver?.phone || '',
        vehicle: assignedDriver?.motorcycle || '',
        price: activeTrip.price || 10,
        pickup: currentLocation?.name || 'Mi Ubicación',
        destination: destination?.name || 'Destino',
        status: 'COMPLETED',
        rating: rating,
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
        driverRating: rating,
        motorcycle: assignedDriver.motorcycle,
        status: 'COMPLETED',
        group: 'TODAY',
      });
    }
    resetRide();
  };

  const filteredDestinations = RIBERALTA_DESTINATIONS.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.address.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Top Floating Header Branding, Mode Switcher & Location Alert */}
      <div className="relative z-10 pt-safe px-4 pt-4 pointer-events-none space-y-2.5 max-w-sm mx-auto w-full">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface/90 border border-gold-primary/30 backdrop-blur-md shadow-lg">
            <img
              src="/logo.png"
              alt="RiberGO Logo"
              className="w-5 h-5 object-contain rounded-md"
            />
            <span className="text-sm font-black tracking-tight">
              <span className="text-white">Riber</span>
              <span className="text-gold-primary">GO</span>
            </span>
          </div>
        </div>

        {/* Top Transport Mode Selector Pill */}
        <div className="pointer-events-auto grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface/90 border border-gold-primary/30 backdrop-blur-md shadow-xl text-xs font-black">
          <button
            onClick={() => {
              haptics.selection();
              setActiveTransportMode('URBAN_MOTOTAXI');
            }}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              !isTerminalMode
                ? 'bg-gold-primary text-background shadow-md shadow-gold-primary/20'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Mototaxi Urbana</span>
          </button>

          <button
            onClick={() => {
              haptics.selection();
              setActiveTransportMode('TERMINAL_INTERPROVINCIAL');
            }}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              isTerminalMode
                ? 'bg-gold-primary text-background shadow-md shadow-gold-primary/20'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Terminal (Guayará)</span>
          </button>
        </div>

        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2.5 rounded-xl bg-surface-2/95 border border-gold-primary/30 backdrop-blur-md text-xs text-gold-light flex items-center gap-2 pointer-events-auto"
          >
            <AlertCircle className="w-4 h-4 text-gold-primary shrink-0" />
            <span>{locationError}</span>
          </motion.div>
        )}
      </div>

      {/* FLOATING GPS RECENTER BUTTON (UBICACIÓN EN VIVO) */}
      <div className="relative z-20 px-4 w-full max-w-[430px] mx-auto flex justify-end pointer-events-none mb-2.5 mt-auto">
        <button
          onClick={handleFetchLocation}
          className="pointer-events-auto p-3.5 rounded-2xl bg-surface/95 border-2 border-gold-primary/60 text-gold-primary shadow-[0_12px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(244,197,66,0.35)] backdrop-blur-xl flex items-center justify-center transition active:scale-90 hover:bg-surface hover:border-gold-primary group"
          title="Centrar en mi ubicación GPS"
          aria-label="Centrar en mi ubicación GPS"
        >
          <Navigation className="w-5 h-5 group-hover:scale-110 transition stroke-[2.3]" />
        </button>
      </div>

      {/* Bottom Sheet Panels */}
      <div className="relative z-10 pb-safe px-4 pb-4 w-full max-w-[430px] mx-auto">
        <AnimatePresence mode="wait">
          {/* STATE 1: IDLE / LOCATION_READY */}
          {(passengerState === 'IDLE' || passengerState === 'LOCATION_READY' || passengerState === 'LOCATION_LOADING') && (
            <motion.div
              key="idle"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 text-gold-primary" />
                  <span className="truncate max-w-[220px]">
                    {currentLocation ? currentLocation.name : 'Obteniendo GPS...'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-gold-primary/10 border border-gold-primary/30 text-[10px] font-bold text-gold-primary uppercase">
                  Riberalta
                </span>
              </div>

              {/* URBAN SERVICE TYPE SELECTOR (MOTOTAXI vs REMOLCADA / AUXILIO) */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-2 border border-border-custom">
                <button
                  onClick={() => {
                    haptics.selection();
                    setUrbanServiceType('MOTOTAXI');
                  }}
                  className={`py-2.5 px-3 rounded-xl transition flex flex-col items-center justify-center gap-0.5 text-xs ${
                    urbanServiceType === 'MOTOTAXI'
                      ? 'bg-gold-primary text-background font-black shadow-md shadow-gold-primary/20'
                      : 'text-text-secondary hover:text-white font-bold'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Bike className="w-4 h-4" />
                    <span>Mototaxi Normal</span>
                  </div>
                  <span className="text-[9px] font-semibold opacity-80">10.00 BOB • Viaje rápido</span>
                </button>

                <button
                  onClick={() => {
                    haptics.selection();
                    setUrbanServiceType('REMOLCADA');
                  }}
                  className={`py-2.5 px-3 rounded-xl transition flex flex-col items-center justify-center gap-0.5 text-xs ${
                    urbanServiceType === 'REMOLCADA'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-background font-black shadow-md shadow-gold-primary/20'
                      : 'text-text-secondary hover:text-white font-bold'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    <span>Remolcada / Auxilio</span>
                  </div>
                  <span className="text-[9px] font-semibold opacity-80">Empuje con pie a taller</span>
                </button>
              </div>

              {/* REMOLCADA BANNER NOTICE IF SELECTED */}
              {urbanServiceType === 'REMOLCADA' && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Servicio de Auxilio Mecánico</p>
                    <p className="text-[11px] text-amber-200/80 leading-snug">
                      Un mototaxista vendrá a tu ubicación y remolcará tu motocicleta con el pie hasta tu casa o taller mecánico en Riberalta.
                    </p>
                  </div>
                </div>
              )}

              {/* MAIN BOOKING BUTTON */}
              <button
                onClick={handleStartBooking}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl transition active:scale-[0.98] group ${
                  urbanServiceType === 'REMOLCADA'
                    ? 'bg-gradient-to-r from-amber-500 via-gold-primary to-yellow-500 text-background shadow-amber-500/25'
                    : 'bg-gold-primary hover:bg-gold-light text-background shadow-gold-primary/25'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center text-background group-hover:scale-110 transition">
                  {urbanServiceType === 'REMOLCADA' ? <Wrench className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                </div>
                <span className="tracking-wide">
                  {urbanServiceType === 'REMOLCADA' ? 'PEDIR AUXILIO / REMOLCADA' : 'PEDIR MOTOTAXI'}
                </span>
              </button>

              <div className="text-center">
                <button
                  onClick={handleFetchLocation}
                  className="text-xs font-semibold text-text-secondary hover:text-white transition inline-flex items-center gap-1.5"
                >
                  <Navigation className="w-3 h-3 text-gold-primary" />
                  <span>Usar mi ubicación actual</span>
                </button>
              </div>
            </motion.div>
          )}



          {/* STATE 4: SEARCHING DRIVER (Radar Animation) */}
          {passengerState === 'SEARCHING_DRIVER' && (
            <motion.div
              key="searching"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl text-center space-y-4"
            >
              {/* Radar Concentric Circles */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-gold-primary/30 animate-radar" />
                <div className="absolute inset-2 rounded-full border-2 border-gold-primary/20 animate-radar" style={{ animationDelay: '0.6s' }} />
                <div className="w-14 h-14 rounded-full bg-gold-primary/10 border border-gold-primary/50 flex items-center justify-center text-gold-primary">
                  <Bike className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Buscando mototaxi</h3>
                <p className="text-xs text-text-secondary mt-1">Estamos buscando un conductor cercano en Riberalta...</p>
              </div>

              <button
                onClick={() => {
                  haptics.selection();
                  const tripId = activeTrip?.id;
                  // 1. Optimistic UI: cerrar INMEDIATAMENTE (0ms)
                  setActiveTrip(null);
                  setPassengerState('IDLE');
                  // 2. Limpieza en Firestore en segundo plano
                  if (tripId) {
                    apiService.cancelRideRequest(tripId);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-surface-2 text-xs font-semibold text-text-secondary hover:text-white transition active:scale-95"
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
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <span className="text-xs font-bold text-gold-primary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gold-primary animate-ping" />
                  ¡Mototaxi encontrado!
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
                      <span>{assignedDriver.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{assignedDriver.trips} viajes completados</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 text-[10px] font-semibold text-white">
                      {assignedDriver.motorcycle || 'Mototaxi'}
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
                {activeTrip?.serviceType === 'REMOLCADA' ? (
                  <Wrench className="w-4 h-4 shrink-0 animate-bounce text-amber-400" />
                ) : (
                  <Bike className="w-4 h-4 shrink-0 animate-bounce text-gold-primary" />
                )}
                <span className="font-medium text-[11px] leading-tight">
                  {activeTrip?.serviceType === 'REMOLCADA'
                    ? 'El mototaxista va en camino para auxiliarte y remolcar tu moto. El conductor iniciará el auxilio.'
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
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4"
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
              className="p-6 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl text-center space-y-4"
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

              {/* Rating selector */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase">Califica tu viaje</p>
                <div className="flex justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 transition transform active:scale-125"
                    >
                      <Star
                        className={`w-7 h-7 ${star <= rating ? 'fill-gold-primary text-gold-primary' : 'text-text-secondary'}`}
                      />
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Cuéntanos cómo fue tu viaje (opcional)"
                  className="w-full bg-surface border border-border-custom rounded-xl py-2 px-3 text-xs text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary"
                />
              </div>

              <button
                onClick={handleFinishTrip}
                className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-black text-sm shadow-xl shadow-gold-primary/20 transition"
              >
                Finalizar
              </button>
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
                      <span>{selectedDriver.rating ? Number(selectedDriver.rating).toFixed(1) : '5.0'}</span>
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
