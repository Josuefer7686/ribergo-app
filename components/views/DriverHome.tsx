'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MapView } from '@/components/map/MapView';
import { 
  Power, Navigation, MapPin, MessageSquare, Check, X, Clock, DollarSign, User, Bike, ChevronRight, AlertCircle, QrCode 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

import { apiService } from '@/services/apiService';
import { DriverWalletTutorialModal } from '@/components/modals/DriverWalletTutorialModal';
import { QrTopupModal } from '@/components/modals/QrTopupModal';

export const DriverHome = () => {
  const { 
    user, currentLocation,
    driverState, setDriverState, 
    pendingRequest, setPendingRequest,
    activeTrip, setActiveTrip,
    setActiveTab, addTripToHistory, preferences,
    setHasCompletedDriverTutorial, topUpWallet, deductWalletCommission
  } = useAppStore();

  const [countdown, setCountdown] = useState(15);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return Boolean(user?.role === 'DRIVER' && !user?.hasCompletedDriverTutorial);
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [lowBalanceBanner, setLowBalanceBanner] = useState(false);

  const isOnline = driverState !== 'OFFLINE';
  const walletBalance = user?.walletBalance ?? 50.0;

  const driverId = user?.id || 'drv-' + (user?.phone?.replace(/[^0-9]/g, '') || 'demo');
  const driverName = user?.name || 'Carlos Mendoza';
  const driverPhone = user?.phone || '+591 76543210';
  const motorcycle = user?.motorcycle || 'Honda Wave 110';
  const plate = user?.plate || 'RBT-482';

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

  const toggleOnline = async () => {
    haptics.impact();
    const nextOnlineState = !isOnline;
    const loc = currentLocation || { lat: -11.0061, lng: -66.0747, name: 'Riberalta Centro' };

    if (nextOnlineState) {
      // Check if driver has sufficient wallet balance to work
      if (walletBalance <= 0) {
        haptics.error();
        setLowBalanceBanner(true);
        setShowQrModal(true);
        return;
      }

      setDriverState('ONLINE');
      await apiService.setDriverOnlineStatus(
        driverId, driverName, driverPhone, motorcycle, plate, 5.0, loc, true
      );
    } else {
      setDriverState('OFFLINE');
      setPendingRequest(null);
      await apiService.setDriverOnlineStatus(
        driverId, driverName, driverPhone, motorcycle, plate, 5.0, loc, false
      );
    }
  };

  // Subscribe to real-time pending ride requests in Firestore when ONLINE
  useEffect(() => {
    if (driverState !== 'ONLINE') return;

    const unsubscribe = apiService.subscribeToPendingRides((pendingRides) => {
      if (pendingRides.length > 0 && !activeTrip) {
        const req = pendingRides[0];
        setPendingRequest({
          id: req.id,
          pickup: req.pickup,
          destination: req.destination,
          price: req.price || 8,
          distanceKm: req.distanceKm || 2.5,
          durationMin: req.durationMin || 7,
          passengerName: req.passengerName || 'Pasajero RiberGO',
          passengerPhone: req.passengerPhone || '+591 70000000',
          passengerRating: 5.0,
        });
        haptics.driverIncoming();
        audio.driverIncomingRequest();
        setDriverState('RIDE_REQUEST');
        setCountdown(15);
      }
    });

    return () => unsubscribe();
  }, [driverState, activeTrip, setPendingRequest, setDriverState]);

  // Request countdown timer with sound & haptic alerts
  useEffect(() => {
    if (driverState === 'RIDE_REQUEST') {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
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
    haptics.heavy();
    audio.driverTripAccepted();
    if (pendingRequest) {
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

      await apiService.acceptRide(pendingRequest.id, driverData);
      setActiveTrip({
        ...pendingRequest,
        driver: driverData,
      });
      setDriverState('GOING_TO_PASSENGER');
    }
  };

  const handleRejectRequest = () => {
    haptics.error();
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

  const handleFinishDriverTrip = async () => {
    haptics.success();
    if (activeTrip?.id) {
      await apiService.updateRideStatus(activeTrip.id, 'COMPLETED');
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
    } else {
      setDriverState('ONLINE');
    }

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
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-surface/90 border border-border-custom backdrop-blur-md shadow-lg">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-gold-primary animate-pulse' : 'bg-text-secondary'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isOnline ? 'En línea' : 'Fuera de línea'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Low balance warning floating banner */}
        {lowBalanceBanner && walletBalance <= 0 && (
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

      {/* Bottom Floating Cards */}
      <div className="relative z-10 pb-safe px-4 pb-4 w-full max-w-[430px] mx-auto mt-auto">
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
                  {walletBalance <= 0 
                    ? 'Recarga tu saldo para volver a conectarte.' 
                    : 'Conéctate para recibir solicitudes de mototaxi en Riberalta.'}
                </p>
              </div>
              <button
                onClick={toggleOnline}
                className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-sm shadow-xl shadow-gold-primary/20 transition active:scale-95"
              >
                {walletBalance <= 0 ? 'RECARGAR Y CONECTARME' : 'PONERME EN LÍNEA'}
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
                <span className="text-xl font-black text-gold-primary">{pendingRequest.price} BOB</span>
              </div>

              {/* Passenger & Trip Info */}
              <div className="p-3.5 rounded-2xl bg-surface-2 border border-border-custom space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{pendingRequest.passengerName}</h4>
                    <p className="text-xs text-text-secondary">★ {pendingRequest.passengerRating} pasajero</p>
                  </div>
                </div>

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
                <span className="text-xs font-bold text-gold-primary">En camino al pasajero</span>
                <span className="text-xs text-text-secondary">~3 min</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                  <User className="w-5 h-5" />
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
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-gold-primary/20 transition"
                >
                  <span>Iniciar Viaje</span>
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
                  <Bike className="w-4 h-4 text-gold-primary animate-pulse" />
                  Viaje en curso
                </span>
                <span className="text-sm font-black text-gold-primary">{activeTrip.price} BOB</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-2 border border-border-custom text-xs space-y-1">
                <p className="text-text-secondary">Destino: <span className="text-white font-bold">{activeTrip.destination.name}</span></p>
                <p className="text-text-secondary">Pasajero: <span className="text-white font-semibold">{activeTrip.passengerName}</span></p>
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
                  onClick={handleFinishDriverTrip}
                  className="py-3 bg-gold-primary hover:bg-gold-light text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-gold-primary/20 transition"
                >
                  <span>Finalizar Viaje</span>
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
    </div>
  );
};

