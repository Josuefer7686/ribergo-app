'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, LocationPoint } from '@/store/useAppStore';
import { MapView } from '@/components/map/MapView';
import { 
  Power, Navigation, MapPin, MessageSquare, Check, X, Clock, DollarSign, User, Bike, ChevronRight, AlertCircle, QrCode, Sparkles, Wrench, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { calculateBearing, calculateDistanceMeters } from '@/utils/geo';

import { apiService, realtimeSyncBus } from '@/services/apiService';
import { DriverWalletTutorialModal } from '@/components/modals/DriverWalletTutorialModal';
import { QrTopupModal } from '@/components/modals/QrTopupModal';
import { NegotiationChatModal } from '@/components/modals/NegotiationChatModal';

export const DriverHome = () => {
  const { 
    user, currentLocation, setCurrentLocation,
    driverState, setDriverState, 
    pendingRequest, setPendingRequest,
    activeTrip, setActiveTrip,
    setActiveTab, addTripToHistory, preferences,
    setHasCompletedDriverTutorial, topUpWallet, deductWalletCommission,
    decrementFreeTrips, triggerMapRecenter
  } = useAppStore();

  const [countdown, setCountdown] = useState(15);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return Boolean(user?.role === 'DRIVER' && !user?.hasCompletedDriverTutorial);
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [lowBalanceBanner, setLowBalanceBanner] = useState(false);

  const lastLocationRef = useRef<LocationPoint | null>(currentLocation);
  const isAcceptingRef = useRef(false);
  const driverStateRef = useRef(driverState);
  const activeTripRef = useRef(activeTrip);
  const pendingRequestRef = useRef(pendingRequest);
  const lastAlertedRideIdRef = useRef<string | null>(null);
  const acceptedAtMsRef = useRef<number>(0);

  useEffect(() => {
    driverStateRef.current = driverState;
    activeTripRef.current = activeTrip;
    pendingRequestRef.current = pendingRequest;
  }, [driverState, activeTrip, pendingRequest]);

  // Rejected ride IDs for this driver session (en caso de ser rechazado, no volver a mostrar al mismo conductor)
  const [rejectedRideIds, setRejectedRideIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem('ribergo_rejected_rides');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const markRideAsRejected = (rideId: string) => {
    setRejectedRideIds((prev) => {
      if (prev.includes(rideId)) return prev;
      const updated = [...prev, rideId];
      try {
        sessionStorage.setItem('ribergo_rejected_rides', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const isOnline = driverState !== 'OFFLINE';
  const walletBalance = user?.walletBalance ?? 0.0;
  const freeTrips = user?.freeTripsRemaining ?? 0;

  const driverId = user?.id || (user?.phone ? 'drv-' + user.phone.replace(/[^0-9]/g, '') : 'drv-ribergo');
  const driverName = user?.name || 'Conductor';
  const driverPhone = user?.phone || '';
  const motorcycle = user?.motorcycle || '';
  const plate = user?.plate || '';
  const rating = user?.rating ?? 5.0;
  const trips = user?.trips ?? 0;
  const avatar = user?.avatar || '';

  // Check if first-time driver tutorial needs to open automatically
  useEffect(() => {
    if (user?.role === 'DRIVER' && !user?.hasCompletedDriverTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user?.role, user?.hasCompletedDriverTutorial]);

  const handleCloseTutorial = async () => {
    setShowTutorial(false);
    setHasCompletedDriverTutorial(true);
    if (user?.id) {
      await apiService.setDriverTutorialCompleted(user.id);
    }
  };

  const handleTopupSuccess = async (amount: number) => {
    topUpWallet(amount);
    setLowBalanceBanner(false);
    if (user?.id) {
      await apiService.topUpDriverWallet(user.id, amount, walletBalance);
    }
  };

  const getAccurateLocation = (): Promise<LocationPoint> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        resolve(currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Riberalta' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const freshLoc: LocationPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'GPS en Vivo',
            address: 'Ubicación actual exacta',
          };
          setCurrentLocation(freshLoc);
          lastLocationRef.current = freshLoc;
          resolve(freshLoc);
        },
        () => {
          resolve(currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Riberalta' });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    });
  };

  const toggleOnline = async () => {
    haptics.impact();
    const nextOnlineState = !isOnline;

    if (nextOnlineState) {
      // Check if driver has sufficient wallet balance or free gift trips to work
      if (walletBalance <= 0 && freeTrips <= 0) {
        haptics.error();
        setLowBalanceBanner(true);
        setShowQrModal(true);
        return;
      }

      // Limpiar estados residuales previos para recibir solicitudes limpias
      setActiveTrip(null);
      setPendingRequest(null);
      setDriverState('ONLINE');

      const loc = await getAccurateLocation();
      await apiService.setDriverOnlineStatus(
        driverId, driverName, driverPhone, motorcycle, plate, rating, loc, true, 0, 0, trips, avatar
      );
    } else {
      setDriverState('OFFLINE');
      setPendingRequest(null);
      const loc = currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Riberalta Centro' };
      await apiService.setDriverOnlineStatus(
        driverId, driverName, driverPhone, motorcycle, plate, rating, loc, false, 0, 0, trips, avatar
      );
    }
  };

  // 1. Real GPS Location Tracker when ONLINE with Maximum Accuracy (100% Real GPS, No Simulation)
  useEffect(() => {
    if (!isOnline || typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoords: LocationPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'Conductor en Ruta',
          address: 'GPS en Vivo',
        };

        let heading = pos.coords.heading ?? 0;
        if (lastLocationRef.current) {
          const dist = calculateDistanceMeters(
            lastLocationRef.current.lat,
            lastLocationRef.current.lng,
            newCoords.lat,
            newCoords.lng
          );
          if (dist >= 1.0) {
            heading = calculateBearing(
              lastLocationRef.current.lat,
              lastLocationRef.current.lng,
              newCoords.lat,
              newCoords.lng
            );
          }
        }

        lastLocationRef.current = newCoords;
        setCurrentLocation(newCoords);
        const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        apiService.updateDriverLocation(driverId, newCoords, heading, speedKmh);
      },
      (err) => console.warn('Driver geolocation watch error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, driverId, setCurrentLocation]);

  // Subscribe to active trip updates (e.g. negotiation, payment, fare updates, or cancellation)
  useEffect(() => {
    if (!activeTrip?.id) return;
    const tripId = activeTrip.id;

    const unsubscribe = apiService.subscribeToRide(tripId, (rideData) => {
      if (!rideData) return;

      // Si el viaje fue cancelado o autodestruido
      if (rideData.status === 'CANCELLED') {
        haptics.error();
        setDriverState('ONLINE');
        setActiveTrip(null);
        setPendingRequest(null);
        lastAlertedRideIdRef.current = null;
        return;
      }

      if (rideData.status === 'GOING_TO_PASSENGER' && driverStateRef.current === 'NEGOTIATING') {
        setDriverState('GOING_TO_PASSENGER');
      }

      // Si la negociación fue liberada o cancelada por el pasajero:
      // Solo regresar a ONLINE si el viaje ya no nos corresponde (sin chofer o con otro chofer)
      if (rideData.status === 'SEARCHING_DRIVER') {
        // Si el chofer acaba de aceptar este viaje en los últimos 12 segundos, NO abortar (evitar lecturas no sincronizadas de Firestore)
        const elapsedSinceAccept = Date.now() - (acceptedAtMsRef.current || 0);
        if (elapsedSinceAccept < 12000) {
          return;
        }

        if (!rideData.driverId || (rideData.driverId && rideData.driverId !== driverId)) {
          setDriverState('ONLINE');
          setActiveTrip(null);
          return;
        }
      }

      setActiveTrip({
        ...(activeTripRef.current || {}),
        ...rideData,
      } as any);
    });
    return () => unsubscribe();
  }, [activeTrip?.id, driverId, setDriverState, setActiveTrip]);

  // Subscribe to real-time pending ride requests in Firestore & RealtimeSyncBus while ONLINE
  useEffect(() => {
    if (!isOnline) {
      lastAlertedRideIdRef.current = null;
      return;
    }

    const unsubscribe = apiService.subscribeToPendingRides((pendingRides) => {
      // Filtrar solicitudes que este chofer específico ya rechazó
      let rejected: string[] = [];
      try {
        const raw = sessionStorage.getItem('ribergo_rejected_rides');
        if (raw) rejected = JSON.parse(raw);
      } catch (e) {}
      const allRejected = Array.from(new Set([...rejectedRideIds, ...rejected]));
      const availableRides = pendingRides.filter((r) => !allRejected.includes(r.id));

      const currentState = driverStateRef.current;
      const currentActiveTrip = activeTripRef.current;
      const currentPending = pendingRequestRef.current;

      // Solo ignorar si el conductor ya tiene un viaje activo en curso
      const isTripOngoing = currentActiveTrip && (
        currentActiveTrip.status === 'NEGOTIATING' || 
        currentActiveTrip.status === 'GOING_TO_PASSENGER' || 
        currentActiveTrip.status === 'TRIP_STARTED'
      );

      if (isTripOngoing) {
        lastAlertedRideIdRef.current = null;
        return;
      }

      // Si el chofer está en la tarjeta de solicitud entrante pero el viaje fue tomado por otro o cancelado
      if (currentState === 'RIDE_REQUEST' && currentPending && !isAcceptingRef.current) {
        const stillInAvailable = availableRides.some((r) => r.id === currentPending.id);
        if (!stillInAvailable && availableRides.length > 0) {
          setPendingRequest(null);
          setDriverState('ONLINE');
          lastAlertedRideIdRef.current = null;
        }
        return;
      }

      if (availableRides.length > 0 && currentState === 'ONLINE') {
        const req = availableRides[0];

        // Anti-loop: si ya alertó esta misma solicitud, no volver a disparar audio ni reiniciar countdown
        if (lastAlertedRideIdRef.current === req.id && currentPending?.id === req.id) {
          return;
        }

        lastAlertedRideIdRef.current = req.id;
        setPendingRequest({
          id: req.id,
          pickup: req.pickup,
          destination: req.destination,
          price: req.price || 10,
          distanceKm: req.distanceKm || 2.5,
          durationMin: req.durationMin || 7,
          passengerName: req.passengerName || 'Pasajero RiberGO',
          passengerPhone: req.passengerPhone || '+591 70000000',
          passengerRating: 5.0,
          paymentMethod: req.paymentMethod || 'CASH',
          paymentStatus: req.paymentStatus || 'PENDING',
        });
        haptics.driverIncoming();
        audio.driverIncomingRequest();
        setDriverState('RIDE_REQUEST');
        setCountdown(15);
      }
    });

    return () => unsubscribe();
  }, [isOnline, rejectedRideIds, setPendingRequest, setDriverState]);

  // Request countdown timer with sound & haptic alerts
  useEffect(() => {
    if (driverState === 'RIDE_REQUEST') {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (pendingRequestRef.current?.id) {
              markRideAsRejected(pendingRequestRef.current.id);
            }
            lastAlertedRideIdRef.current = null;
            setDriverState('ONLINE');
            setPendingRequest(null);
            return 15;
          }

          const nextVal = prev - 1;
          if (nextVal <= 5) {
            haptics.driverUrgent5s();
            audio.driverUrgentWarning();
          } else {
            haptics.countdownTick();
            audio.driverCountdownTick();
          }

          return nextVal;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [driverState, setDriverState, setPendingRequest]);

  const handleAcceptRequest = async () => {
    if (!pendingRequest || isAcceptingRef.current) return;
    isAcceptingRef.current = true;
    haptics.heavy();
    audio.driverTripAccepted();

    const rideToAccept = pendingRequest;
    const driverData = {
      id: driverId,
      name: driverName,
      phone: driverPhone,
      rating: 5.0,
      trips: 24,
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      motorcycle,
      plate,
      currentLocation: currentLocation || { lat: -11.0061, lng: -66.0747 },
    };

    const updatedRide = {
      ...rideToAccept,
      status: 'NEGOTIATING',
      driverId: driverData.id,
      driverName: driverData.name,
      driverPhone: driverData.phone,
      driverRating: driverData.rating,
      motorcycle: driverData.motorcycle,
      plate: driverData.plate,
      driver: driverData,
      acceptedAtMs: Date.now(),
    };

    // 1. Guardar de inmediato en el bus local ANTES de renderizar el chat para evitar lecturas de SEARCHING_DRIVER
    realtimeSyncBus.saveRide(updatedRide);

    // 2. Fijar estado en store y registrar marca temporal (0ms)
    acceptedAtMsRef.current = Date.now();
    lastAlertedRideIdRef.current = rideToAccept.id;
    setActiveTrip(updatedRide);
    setDriverState('NEGOTIATING');
    setPendingRequest(null);

    // 3. Persistir en Firestore de fondo
    try {
      await apiService.acceptRide(rideToAccept.id, driverData);
    } catch (err) {
      console.warn('Error accepting ride:', err);
    } finally {
      isAcceptingRef.current = false;
    }
  };

  const handleRejectRequest = () => {
    haptics.error();
    if (pendingRequest?.id) {
      markRideAsRejected(pendingRequest.id);
    }
    lastAlertedRideIdRef.current = null;
    setPendingRequest(null);
    setDriverState('ONLINE');
  };

  const handleStartPassengerTrip = async () => {
    haptics.impact();
    setDriverState('TRIP_STARTED');
    if (activeTrip?.id) {
      await apiService.updateRideStatus(activeTrip.id, 'TRIP_STARTED');
    }
  };

  // Driver approves QR payment receipt
  const handleApproveQrPayment = async () => {
    haptics.success();
    audio.driverTripAccepted();
    if (activeTrip?.id) {
      await apiService.confirmRideQrPayment(activeTrip.id);
      setActiveTrip({
        ...activeTrip,
        paymentStatus: 'CONFIRMED',
      });
    }
  };

  const handleFinishDriverTrip = async () => {
    haptics.success();
    if (activeTrip?.id) {
      await apiService.finishTripAndArchive(activeTrip.id, {
        passengerId: (activeTrip as any).passengerId || '',
        passengerName: activeTrip.passengerName || 'Pasajero',
        passengerPhone: activeTrip.passengerPhone || '',
        driverId: driverId,
        driverName: driverName,
        driverPhone: driverPhone,
        vehicle: motorcycle,
        price: activeTrip.price || 10,
        pickup: activeTrip.pickup?.name || 'Origen',
        destination: activeTrip.destination?.name || 'Destino',
        status: 'COMPLETED',
        rating: 5,
      });
    }
    if (activeTrip) {
      addTripToHistory({
        id: activeTrip.id,
        date: 'Hoy',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pickup: activeTrip.pickup.name || 'Origen',
        destination: activeTrip.destination.name || 'Destino',
        price: activeTrip.price,
        driverName: activeTrip.passengerName || 'Pasajero',
        driverRating: 5,
        motorcycle: motorcycle,
        status: 'COMPLETED',
        group: 'TODAY',
      });
    }

    // Commission logic: Check if driver has gift free trips remaining
    if (freeTrips > 0) {
      decrementFreeTrips();
      if (user?.id) {
        await apiService.decrementDriverFreeTrips(user.id, freeTrips);
      }
    } else {
      // Deduct 1 BOB commission from driver wallet
      deductWalletCommission(1.0);
      if (user?.id) {
        await apiService.deductTripCommission(user.id, walletBalance, 1.0);
      }

      // If new balance will be 0 or less, notify driver
      if (walletBalance - 1.0 <= 0) {
        setDriverState('OFFLINE');
        setLowBalanceBanner(true);
        setShowQrModal(true);
        setActiveTrip(null);
        setPendingRequest(null);
        return;
      }
    }

    setDriverState('ONLINE');
    setActiveTrip(null);
    setPendingRequest(null);
  };

  return (
    <div className="w-full h-full relative flex flex-col justify-between overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>

      {/* Top Header Toggle Status */}
      <div className="relative z-10 pt-safe px-4 pt-4 pointer-events-none space-y-2">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-surface/90 border border-gold-primary/30 backdrop-blur-md shadow-lg">
            <img
              src="/logo.png"
              alt="RiberGO Logo"
              className="w-5 h-5 object-contain rounded-md"
            />
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-gold-primary animate-pulse' : 'bg-text-secondary'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isOnline ? 'En línea' : 'Fuera de línea'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Free Trips Gift Badge */}
            {freeTrips > 0 && (
              <div className="px-2.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-gold-primary text-gold-primary backdrop-blur-md text-xs font-black flex items-center gap-1 shadow-lg animate-pulse">
                <Bike className="w-3.5 h-3.5" />
                <span>{freeTrips} gratis</span>
              </div>
            )}

            {/* Quick Wallet Balance Pill */}
            <button
              onClick={() => setActiveTab('INCOME')}
              className="px-3 py-2 rounded-2xl bg-surface/90 border border-gold-primary/40 text-gold-primary backdrop-blur-md text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{walletBalance.toFixed(2)} BOB</span>
            </button>

            {/* ONLINE TOGGLE BUTTON */}
            <button
              onClick={toggleOnline}
              className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition active:scale-95 ${
                isOnline 
                  ? 'bg-surface-2 border border-gold-primary/40 text-gold-primary hover:bg-surface' 
                  : 'bg-gold-primary text-background shadow-gold-primary/25 hover:bg-gold-light'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isOnline ? 'Desconectar' : 'Conectarme'}</span>
            </button>
          </div>
        </div>

        {/* Low balance warning floating banner (solo si no tiene saldo Y tampoco tiene viajes gratis) */}
        {lowBalanceBanner && walletBalance <= 0 && freeTrips <= 0 && (
          <div className="pointer-events-auto max-w-[430px] mx-auto p-3 rounded-2xl bg-rose-500/90 text-white text-xs font-semibold flex items-center justify-between shadow-xl backdrop-blur-md animate-bounce">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Saldo 0.00 BOB. ¡Recarga para conectarte!</span>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-2.5 py-1 bg-white text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider"
            >
              Recargar
            </button>
          </div>
        )}
      </div>

      {/* FLOATING GPS RECENTER BUTTON FOR DRIVER */}
      <div className="relative z-20 px-4 w-full max-w-[430px] mx-auto flex justify-end pointer-events-none mb-2.5 mt-auto">
        <button
          onClick={() => {
            haptics.selection();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ribergo:recenter_map'));
            }
            triggerMapRecenter();
          }}
          className="pointer-events-auto p-3.5 rounded-2xl bg-surface/95 border-2 border-gold-primary/60 text-gold-primary shadow-[0_12px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(244,197,66,0.35)] backdrop-blur-xl flex items-center justify-center transition active:scale-90 hover:bg-surface hover:border-gold-primary group"
          title="Centrar en mi ubicación GPS"
          aria-label="Centrar en mi ubicación GPS"
        >
          <Navigation className="w-5 h-5 group-hover:scale-110 transition stroke-[2.3]" />
        </button>
      </div>

      {/* Bottom Floating Cards */}
      <div className="relative z-10 pb-safe px-4 pb-4 w-full max-w-[430px] mx-auto">
        <AnimatePresence mode="wait">
          {/* OFFLINE */}
          {driverState === 'OFFLINE' && (
            <motion.div
              key="offline"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-custom flex items-center justify-center text-text-secondary mx-auto">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Estás fuera de línea</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {freeTrips > 0 
                    ? `¡Tienes ${freeTrips} viajes gratis de bienvenida sin comisión!`
                    : walletBalance <= 0 
                    ? 'Recarga tu saldo para volver a conectarte.' 
                    : 'Conéctate para recibir solicitudes de mototaxi en Riberalta.'}
                </p>
              </div>
              <button
                onClick={toggleOnline}
                className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-sm shadow-xl shadow-gold-primary/20 transition active:scale-95"
              >
                {freeTrips > 0 || walletBalance > 0 ? 'PONERME EN LÍNEA' : 'RECARGAR Y CONECTARME'}
              </button>
            </motion.div>
          )}

          {/* ONLINE - SEARCHING */}
          {driverState === 'ONLINE' && (
            <motion.div
              key="online"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                  <Bike className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gold-primary uppercase tracking-wider">Buscando viajes...</h3>
                  <p className="text-xs text-text-secondary">Conectado y listo para recibir pasajeros.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* RIDE REQUEST POPUP */}
          {driverState === 'RIDE_REQUEST' && pendingRequest && (
            <motion.div
              key="request"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border-2 border-gold-primary backdrop-blur-xl shadow-2xl space-y-4 relative overflow-hidden"
            >
              {/* Countdown Progress Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-surface-2">
                <div 
                  className="h-full bg-gold-primary transition-all ease-linear" 
                  style={{ width: `${(countdown / 15) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-black text-gold-primary uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gold-primary animate-ping" />
                  Nueva Solicitud ({countdown}s)
                </span>
                <div className="text-right">
                  <span className="text-xl font-black text-gold-primary">{pendingRequest.price} BOB</span>
                  {pendingRequest.serviceType === 'REMOLCADA' ? (
                    <span className="block text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center justify-end gap-1">
                      <Wrench className="w-3 h-3 text-amber-400" />
                      Auxilio / Remolcada
                    </span>
                  ) : pendingRequest.price > 10 ? (
                    <span className="block text-[9px] font-black text-amber-400 uppercase tracking-wider">
                      ⚡ ¡Oferta atractiva!
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Passenger & Trip Info */}
              <div className="p-3.5 rounded-2xl bg-surface-2 border border-border-custom space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      pendingRequest.serviceType === 'REMOLCADA'
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                        : 'bg-gold-primary/20 border border-gold-primary/40 text-gold-primary'
                    }`}>
                      {pendingRequest.serviceType === 'REMOLCADA' ? <Wrench className="w-5 h-5 animate-pulse" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{pendingRequest.passengerName}</h4>
                      <p className="text-xs text-text-secondary">★ {pendingRequest.passengerRating || 5.0} pasajero</p>
                    </div>
                  </div>
                  {pendingRequest.serviceType === 'REMOLCADA' && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                      Auxilio
                    </span>
                  )}
                </div>

                {/* Distance & ETA from driver to passenger pickup */}
                {(() => {
                  const distToPickupMeters = (currentLocation && pendingRequest.pickup)
                    ? calculateDistanceMeters(currentLocation.lat, currentLocation.lng, pendingRequest.pickup.lat, pendingRequest.pickup.lng)
                    : Math.round(pendingRequest.distanceKm * 1000);
                  const distToPickupKm = (distToPickupMeters / 1000).toFixed(1);
                  const etaToPickupMin = Math.max(1, Math.round(distToPickupMeters / 333)); // ~20 km/h mototaxi
                  return (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gold-primary/10 border border-gold-primary/30 text-xs">
                      <div className="flex items-center gap-1.5 text-gold-primary font-bold">
                        <Navigation className="w-3.5 h-3.5 shrink-0 animate-pulse text-gold-primary" />
                        <span>Para recoger:</span>
                      </div>
                      <div className="text-right font-black text-white flex items-center gap-1.5">
                        <span className="text-gold-primary">~{etaToPickupMin} min de ti</span>
                        <span className="text-text-secondary font-normal">•</span>
                        <span>{distToPickupKm} km</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5 text-xs border-t border-border-custom pt-2">
                  <p className="text-text-secondary"><span className="font-bold text-white">Recogida:</span> {pendingRequest.pickup.name}</p>
                  <p className="text-text-secondary"><span className="font-bold text-gold-primary">Destino:</span> {pendingRequest.destination.name}</p>
                  <p className="text-text-secondary">Distancia viaje: <span className="text-white font-semibold">{preferences.settings.units === 'mi' ? (pendingRequest.distanceKm * 0.621371).toFixed(1) + ' mi' : pendingRequest.distanceKm + ' km'}</span></p>
                </div>
              </div>

              {/* Accept / Reject Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRejectRequest}
                  className="py-3 bg-surface-2 hover:bg-surface border border-border-custom text-text-secondary hover:text-white rounded-xl font-bold text-xs uppercase transition"
                >
                  RECHAZAR
                </button>
                <button
                  onClick={handleAcceptRequest}
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-black text-xs uppercase shadow-xl shadow-gold-primary/25 transition active:scale-95"
                >
                  ACEPTAR VIAJE
                </button>
              </div>
            </motion.div>
          )}

          {/* GOING TO PASSENGER */}
          {driverState === 'GOING_TO_PASSENGER' && activeTrip && (
            <motion.div
              key="going"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <span className="text-xs font-bold text-gold-primary flex items-center gap-1.5">
                  {activeTrip.serviceType === 'REMOLCADA' ? (
                    <>
                      <Wrench className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>En camino al auxilio / remolcada</span>
                    </>
                  ) : (
                    <>
                      <Bike className="w-4 h-4 text-gold-primary animate-pulse" />
                      <span>En camino al pasajero</span>
                    </>
                  )}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ruta trazada
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeTrip.serviceType === 'REMOLCADA'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    : 'bg-gold-primary/10 border border-gold-primary/30 text-gold-primary'
                }`}>
                  {activeTrip.serviceType === 'REMOLCADA' ? <Wrench className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{activeTrip.passengerName}</h4>
                  <p className="text-xs text-text-secondary">Recogida: {activeTrip.pickup.name}</p>
                </div>
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
                  onClick={handleStartPassengerTrip}
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-gold-primary/20 transition active:scale-95"
                >
                  <span>{activeTrip.serviceType === 'REMOLCADA' ? 'Iniciar Auxilio' : 'Iniciar Viaje'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* TRIP STARTED DRIVER */}
          {driverState === 'TRIP_STARTED' && activeTrip && (
            <motion.div
              key="started"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-5 rounded-3xl bg-surface/95 border border-border-custom backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <span className="text-xs font-bold text-gold-primary flex items-center gap-1.5">
                  {activeTrip.serviceType === 'REMOLCADA' ? (
                    <>
                      <Wrench className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>Remolcada / Auxilio en curso</span>
                    </>
                  ) : (
                    <>
                      <Bike className="w-4 h-4 text-gold-primary animate-pulse" />
                      <span>Viaje en curso</span>
                    </>
                  )}
                </span>
                <span className="text-sm font-black text-gold-primary">{activeTrip.price} BOB</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-2 border border-border-custom text-xs space-y-1">
                <p className="text-text-secondary">Destino: <span className="text-white font-bold">{activeTrip.destination.name}</span></p>
                <p className="text-text-secondary">Pasajero: <span className="text-white font-semibold">{activeTrip.passengerName}</span></p>
              </div>

              {/* QR PAYMENT VERIFICATION CARD (IF PASSENGER SELECTED QR) */}
              {activeTrip.paymentMethod === 'QR' && (
                <div className="p-3.5 rounded-2xl bg-surface border border-gold-primary/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-gold-primary" />
                      Pago por QR ({activeTrip.price} BOB)
                    </span>
                    {activeTrip.paymentStatus === 'CONFIRMED' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Aprobado ✓
                      </span>
                    ) : activeTrip.paymentStatus === 'WAITING_DRIVER_CONFIRM' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold animate-pulse">
                        ¡Pasajero ya transfirió!
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary text-[10px] font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-text-secondary leading-snug">
                    {activeTrip.paymentStatus === 'CONFIRMED'
                      ? 'Confirmaste la recepción del pago en tu cuenta bancaria.'
                      : activeTrip.paymentStatus === 'WAITING_DRIVER_CONFIRM'
                      ? 'El pasajero indica que ya te envió el dinero. Verifica en tu app del banco y pulsa aprobar:'
                      : 'El pasajero escaneará tu QR al llegar. Espera su transferencia.'}
                  </p>

                  {activeTrip.paymentStatus !== 'CONFIRMED' && (
                    <button
                      onClick={handleApproveQrPayment}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Aprobar Pago QR Recibido</span>
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('MESSAGES')}
                  className="py-3 bg-surface-2 hover:bg-surface border border-gold-primary/40 text-gold-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensaje</span>
                </button>

                <button
                  onClick={handleFinishDriverTrip}
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-gold-primary/20 transition active:scale-95"
                >
                  <span>{activeTrip.serviceType === 'REMOLCADA' ? 'Finalizar Auxilio' : 'Finalizar Viaje'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TUTORIAL AND QR MODALS */}
      <DriverWalletTutorialModal
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
      />

      <QrTopupModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        onSuccess={handleTopupSuccess}
      />

      {/* NEGOTIATION CHAT MODAL */}
      <NegotiationChatModal />
    </div>
  );
};

