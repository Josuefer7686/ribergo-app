'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { MapView } from '@/components/map/MapView';
import { RIBERALTA_DESTINATIONS, DestinationOption, MOCK_DRIVERS } from '@/services/mockData';
import { 
  Bike, Navigation, Search, MapPin, Star, MessageSquare, X, Check, Clock, DollarSign, Shield, ChevronRight, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TerminalView } from '@/components/terminal/TerminalView';
import { Wrench, Bus, AlertTriangle } from 'lucide-react';
import { useAutoLocation } from '@/hooks/useAutoLocation';

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
    urbanServiceType, setUrbanServiceType
  } = useAppStore();

  const { locationError, requestLocation } = useAutoLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Request GPS location on initial load or button tap
  const handleFetchLocation = () => {
    requestLocation();
  };

  // Trigger Mototaxi Request Flow
  const handleStartBooking = () => {
    haptics.heavy();
    audio.passengerRideRequested();
    if (!currentLocation) {
      handleFetchLocation();
    }
    setPassengerState('SELECTING_DESTINATION');
  };

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

  // Listen to real-time updates for active trip
  useEffect(() => {
    if (!activeTrip?.id) return;
    const unsubscribe = apiService.subscribeToRide(activeTrip.id, (rideData) => {
      if (!rideData) return;

      if (rideData.driverId && rideData.status === 'GOING_TO_PASSENGER') {
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
        setAssignedDriver(driverInfo);
        setActiveTrip({
          id: rideData.id,
          pickup: rideData.pickup,
          destination: rideData.destination,
          price: rideData.price,
          distanceKm: rideData.distanceKm || 2.4,
          durationMin: rideData.durationMin || 6,
          driver: driverInfo,
        });
        haptics.success();
        audio.passengerDriverFound();
        setPassengerState('DRIVER_FOUND');
      } else if (rideData.status === 'TRIP_STARTED') {
        setPassengerState('TRIP_STARTED');
      } else if (rideData.status === 'COMPLETED') {
        setPassengerState('TRIP_COMPLETED');
      }
    });

    return () => unsubscribe();
  }, [activeTrip?.id, setActiveTrip, setAssignedDriver, setPassengerState, currentLocation]);

  // Confirm Mototaxi
  const handleConfirmBooking = async () => {
    haptics.notification();
    setPassengerState('SEARCHING_DRIVER');

    const pickupLoc = currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Mi Ubicación' };
    const destLoc = destination || { lat: -11.0061, lng: -66.0747, name: 'Acordar destino en persona' };
    const passengerId = user?.id || 'usr-anon';
    const passengerName = user?.name || 'Pasajero RiberGO';
    const fare = urbanServiceType === 'REMOLCADA' ? 15 : 10;

    try {
      const trip = await apiService.requestRide(pickupLoc, destLoc, fare, passengerId, passengerName);
      setActiveTrip(trip);
    } catch (err) {
      console.error('Request ride error:', err);
    }
  };

  // Passenger manually triggers start/finish if testing solo
  const handleStartTripSimulation = async () => {
    haptics.heavy();
    audio.passengerDriverArrived();
    setPassengerState('TRIP_STARTED');
    if (activeTrip?.id) {
      await apiService.updateRideStatus(activeTrip.id, 'TRIP_STARTED');
    }
  };

  const handleFinishTrip = async () => {
    haptics.success();
    audio.passengerTripFinished();
    if (activeTrip?.id) {
      await apiService.updateRideStatus(activeTrip.id, 'COMPLETED');
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
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface/90 border border-border-custom backdrop-blur-md shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-gold-primary animate-pulse" />
            <span className="text-sm font-black tracking-tight">
              <span className="text-white">Riber</span>
              <span className="text-gold-primary">GO</span>
            </span>
          </div>

          <button
            onClick={handleFetchLocation}
            className="p-2.5 rounded-2xl bg-surface/90 border border-border-custom text-gold-primary hover:bg-surface backdrop-blur-md shadow-lg transition active:scale-95"
            title="Recargar ubicación GPS"
          >
            <Navigation className="w-4 h-4" />
          </button>
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

      {/* Bottom Sheet Panels */}
      <div className="relative z-10 pb-safe px-4 pb-4 w-full max-w-[430px] mx-auto mt-auto">
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

          {/* STATE 2: SELECTING DESTINATION */}
          {passengerState === 'SELECTING_DESTINATION' && (
            <motion.div
              key="selecting"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4 max-h-[75vh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">¿A dónde quieres ir?</h3>
                <button 
                  onClick={() => setPassengerState('IDLE')}
                  className="p-1.5 rounded-full bg-surface-2 text-text-secondary hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar lugar en Riberalta..."
                  className="w-full bg-surface-2 border border-border-custom rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary transition"
                />
              </div>

              {/* Destinations List */}
              <div className="overflow-y-auto no-scrollbar space-y-2 pr-1 flex-1">
                {filteredDestinations.map((dest) => {
                  const isInPerson = dest.id === 'in-person';
                  return (
                    <button
                      key={dest.id}
                      onClick={() => handleSelectDestination(dest)}
                      className={`w-full p-3.5 rounded-2xl text-left flex items-center justify-between group transition shadow-md ${
                        isInPerson
                          ? 'bg-gold-primary/10 border-2 border-gold-primary hover:bg-gold-primary/20'
                          : 'bg-surface-2/60 hover:bg-surface-2 border border-border-custom/50 hover:border-gold-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                          isInPerson 
                            ? 'bg-gold-primary text-background font-bold' 
                            : 'bg-gold-primary/10 border border-gold-primary/20 text-gold-primary group-hover:bg-gold-primary group-hover:text-background'
                        }`}>
                          {isInPerson ? <Bike className="w-5 h-5" /> : <MapPin className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-bold ${isInPerson ? 'text-gold-primary' : 'text-white group-hover:text-gold-primary'} transition`}>
                              {dest.name}
                            </p>
                            {isInPerson && (
                              <span className="px-1.5 py-0.5 rounded-md bg-gold-primary text-background text-[9px] font-black uppercase">
                                Recomendado
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5">{dest.address}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition ${isInPerson ? 'text-gold-primary' : 'text-text-secondary group-hover:text-gold-primary'}`} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STATE 3: CONFIRMING */}
          {passengerState === 'CONFIRMING' && destination && (
            <motion.div
              key="confirming"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Confirmar mototaxi</h3>
                <button 
                  onClick={() => setPassengerState('SELECTING_DESTINATION')}
                  className="p-1.5 rounded-full bg-surface-2 text-text-secondary hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trip Summary Card */}
              {(() => {
                const isInPerson = (destination as any).id === 'in-person' || destination.name?.toLowerCase().includes('acordar');
                const fare = urbanServiceType === 'REMOLCADA' ? 15 : 10;
                return (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-border-custom space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-gold-primary" />
                        {!isInPerson && <div className="w-0.5 h-6 bg-border-custom" />}
                        {!isInPerson && <div className="w-2.5 h-2.5 rounded-full border-2 border-gold-primary bg-background" />}
                      </div>
                      <div className="flex-1 space-y-2 text-xs">
                        <div>
                          <p className="text-[10px] text-text-secondary uppercase font-semibold">Origen</p>
                          <p className="font-semibold text-white">{currentLocation?.name || 'Tu ubicación actual'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-secondary uppercase font-semibold">Destino</p>
                          <p className="font-semibold text-gold-primary">{destination.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border-custom flex items-center justify-between text-xs">
                      {isInPerson ? (
                        <div className="flex items-center gap-1.5 text-gold-light text-[11px] font-semibold">
                          <span>Acordar destino en persona con el chofer</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Clock className="w-3.5 h-3.5 text-gold-primary" />
                          <span>~6 min</span>
                          <span className="mx-1">•</span>
                          <span>{preferences.settings.units === 'mi' ? '1.5 mi' : '2.4 km'}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-lg font-black text-gold-primary">{fare} BOB</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={handleConfirmBooking}
                className="w-full py-4 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-[0.98]"
              >
                <span>
                  {urbanServiceType === 'REMOLCADA' ? 'Solicitar remolcada (15 BOB)' : 'Solicitar mototaxi (10 BOB)'}
                </span>
              </button>
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
                onClick={() => setPassengerState('IDLE')}
                className="px-4 py-2 rounded-xl bg-surface-2 text-xs font-semibold text-text-secondary hover:text-white transition"
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
                      {assignedDriver.motorcycle}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gold-primary/20 text-[10px] font-bold text-gold-primary border border-gold-primary/30">
                      {assignedDriver.plate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: ONLY Chat button (NO Call button as requested) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('MESSAGES')}
                  className="py-3 bg-surface-2 hover:bg-surface border border-gold-primary/40 text-gold-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensaje</span>
                </button>

                <button
                  onClick={handleStartTripSimulation}
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-gold-primary/20 transition"
                >
                  <span>Iniciar Viaje</span>
                  <ChevronRight className="w-4 h-4" />
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
                <span className="text-xs font-bold text-gold-primary flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-gold-primary animate-pulse" />
                  Viaje en curso
                </span>
                <span className="text-xs text-text-secondary font-semibold">En camino al destino</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-2 border border-border-custom text-xs space-y-1.5">
                <p className="text-text-secondary">Destino: <span className="text-white font-bold">{destination?.name}</span></p>
                <p className="text-text-secondary">Tarifa acordada: <span className="text-gold-primary font-bold">{activeTrip?.price || 8} BOB</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('MESSAGES')}
                  className="py-3 bg-surface-2 hover:bg-surface border border-gold-primary/40 text-gold-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensaje</span>
                </button>

                <button
                  onClick={() => setPassengerState('TRIP_COMPLETED')}
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-gold-primary/20 transition"
                >
                  <span>Simular Llegada</span>
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
    </div>
  );
};
