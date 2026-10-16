'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_DRIVERS, DriverData } from '@/services/mockData';
import { apiService } from '@/services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, X, ShieldCheck, Star, Compass, Sparkles, Navigation, ChevronRight } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { calculateDistanceMeters, formatDistance, getBearingDirectionLabel } from '@/utils/geo';

// Fix Leaflet default icon paths
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function getUserIcon() {
  return new L.DivIcon({
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -8px; background: rgba(244,197,66,0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width: 22px; height: 22px; background: #F4C542; border: 3px solid #05080B; border-radius: 50%; box-shadow: 0 0 14px rgba(244,197,66,0.85);"></div>
      </div>
    `,
    className: 'custom-user-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function getDestIcon() {
  return new L.DivIcon({
    html: `
      <div style="width: 26px; height: 26px; background: #05080B; border: 3px solid #F4C542; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(244,197,66,0.7);">
        <div style="width: 8px; height: 8px; background: #F4C542; border-radius: 50%;"></div>
      </div>
    `,
    className: 'custom-dest-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

/**
 * Creates dynamic mototaxi marker with:
 * - Directional pointer cone showing heading (si se mueve que muestre a dónde)
 * - Rotated motorcycle icon
 * - Ambient golden pulse
 * - Clickable interaction
 */
function getMotoIcon(active = false, heading = 0, isMoving = false) {
  const bgColor = active ? '#FFE885' : '#F4C542';
  const rotation = heading || 0;
  
  return new L.DivIcon({
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <!-- Directional Pointer Arrow (Points to heading direction) -->
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(${rotation}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;">
          <div style="position: absolute; top: -7px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid #F4C542; filter: drop-shadow(0 0 5px rgba(244,197,66,0.95));"></div>
        </div>

        <!-- Ambient Golden Pulse Ring -->
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(244,197,66,0.22); ${isMoving || active ? 'animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;' : ''} pointer-events: none;"></div>

        <!-- Inner Mototaxi Bubble with smooth rotation -->
        <div style="width: 36px; height: 36px; background: #05080B; border: 2.5px solid ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.85), 0 0 14px rgba(244,197,66,0.5); transform: scale(${active ? 1.15 : 1}); transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);">
          <div style="transform: rotate(${rotation}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${bgColor}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6h2l3 5v5h-2"/>
              <path d="M5.5 17.5L9 9h5l2.5 5"/>
            </svg>
          </div>
        </div>

        <!-- Online Green Status Indicator Dot -->
        <div style="position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; background: #10B981; border: 2px solid #05080B; border-radius: 50%; box-shadow: 0 0 6px #10B981;"></div>
      </div>
    `,
    className: 'custom-moto-marker-interactive',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

function MapUpdater({ center, destination }: { center: [number, number]; destination?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (center && destination) {
      const bounds = L.latLngBounds([center, destination]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, destination, map]);

  return null;
}

export default function MapComponent() {
  const { 
    currentLocation, destination, role, passengerState, driverState, 
    assignedDriver, onlineDrivers, setOnlineDrivers, setPassengerState 
  } = useAppStore();

  const [animatedMotoPos, setAnimatedMotoPos] = useState<[number, number] | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Check if destination is "Acordar en persona"
  const isInPersonDestination = !destination || (destination as any).id === 'in-person' || destination.name?.toLowerCase().includes('acordar');

  // Subscribe to real-time online drivers from Hybrid SyncBus & Firestore
  useEffect(() => {
    const unsubscribe = apiService.subscribeToOnlineDrivers((drivers) => {
      setOnlineDrivers(drivers);
    });
    return () => unsubscribe();
  }, [setOnlineDrivers]);

  // Use real online drivers if available; fallback to Riberalta mock drivers for immediate offline/local responsiveness
  const activeDriversList: DriverData[] = onlineDrivers.length > 0 ? onlineDrivers : MOCK_DRIVERS;

  // Derive selectedDriver directly from active list so its live position & heading are always 100% synchronized
  const selectedDriver = activeDriversList.find((d) => d.id === selectedDriverId) || null;

  const center: [number, number] = currentLocation 
    ? [currentLocation.lat, currentLocation.lng] 
    : [-11.0061, -66.0747]; 

  // Only define destination coordinates if NOT "Acordar en persona"
  const destPoint: [number, number] | null = (destination && !isInPersonDestination)
    ? [destination.lat, destination.lng]
    : null;

  // Active trip state check
  const isTripActive = (role === 'PASSENGER' && (passengerState === 'CONFIRMING' || passengerState === 'SEARCHING_DRIVER' || passengerState === 'DRIVER_FOUND' || passengerState === 'TRIP_STARTED')) ||
                       (role === 'DRIVER' && (driverState === 'RIDE_REQUEST' || driverState === 'GOING_TO_PASSENGER' || driverState === 'TRIP_STARTED'));

  // Animated mototaxi logic for assigned driver ride
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (role === 'PASSENGER' && passengerState === 'DRIVER_FOUND' && currentLocation) {
      // Driver approaches passenger's current location
      const startLat = assignedDriver?.currentLocation?.lat || (currentLocation.lat + 0.003);
      const startLng = assignedDriver?.currentLocation?.lng || (currentLocation.lng + 0.003);

      let progress = 0;
      interval = setInterval(() => {
        progress += 0.05;
        if (progress > 1) progress = 1;
        const currentLat = startLat + (currentLocation.lat - startLat) * progress;
        const currentLng = startLng + (currentLocation.lng - startLng) * progress;
        setAnimatedMotoPos([currentLat, currentLng]);
      }, 600);
    } else if (isTripActive && !isInPersonDestination && currentLocation && destination && (passengerState === 'TRIP_STARTED' || driverState === 'TRIP_STARTED')) {
      // Riding towards fixed destination
      let progress = 0;
      interval = setInterval(() => {
        progress += 0.05;
        if (progress > 1) progress = 0;
        const currentLat = currentLocation.lat + (destination.lat - currentLocation.lat) * progress;
        const currentLng = currentLocation.lng + (destination.lng - currentLocation.lng) * progress;
        setAnimatedMotoPos([currentLat, currentLng]);
      }, 1000);
    } else {
      const timer = setTimeout(() => setAnimatedMotoPos(null), 0);
      return () => clearTimeout(timer);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTripActive, passengerState, driverState, currentLocation, destination, assignedDriver, isInPersonDestination, role]);

  return (
    <div className="w-full h-full absolute inset-0 z-0 overflow-hidden">
      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={true} 
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} destination={isTripActive && !isInPersonDestination ? destPoint : null} />
        
        {/* User / Pickup Location */}
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={getUserIcon()} />
        )}
        
        {/* Destination Location - ONLY if NOT in-person */}
        {destPoint && !isInPersonDestination && (
          <Marker position={destPoint} icon={getDestIcon()} />
        )}

        {/* Route Polyline - ONLY if NOT in-person */}
        {isTripActive && currentLocation && destPoint && !isInPersonDestination && (
          <Polyline 
            positions={[
              [currentLocation.lat, currentLocation.lng],
              destPoint
            ]}
            color="#F4C542"
            weight={5}
            opacity={0.9}
            lineCap="round"
            lineJoin="round"
            dashArray="8, 8"
          />
        )}

        {/* Animated Active Mototaxi for assigned trip */}
        {animatedMotoPos && (
          <Marker position={animatedMotoPos} icon={getMotoIcon(true, 45, true)} />
        )}
        
        {/* Real Online Mototaxis on Map with Real-time Heading & Tap Interaction */}
        {!animatedMotoPos && role === 'PASSENGER' && (
          passengerState === 'IDLE' || 
          passengerState === 'LOCATION_READY' || 
          passengerState === 'CONFIRMING' || 
          passengerState === 'SEARCHING_DRIVER'
        ) && (
          <>
            {activeDriversList
              .filter((d) => d?.currentLocation?.lat && d?.currentLocation?.lng)
              .map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                const isAssigned = assignedDriver?.id === driver.id;
                const heading = driver.heading || 0;
                const isMoving = (driver.speed || 0) > 0;

                return (
                  <Marker 
                    key={driver.id} 
                    position={[driver.currentLocation.lat, driver.currentLocation.lng]} 
                    icon={getMotoIcon(isSelected || isAssigned, heading, isMoving)}
                    eventHandlers={{
                      click: () => {
                        haptics.impact();
                        audio.tabClick();
                        setSelectedDriverId(driver.id);
                      }
                    }}
                  />
                );
              })}
          </>
        )}
      </MapContainer>

      {/* SUPER ANIMATED MOTORCYCLE & DRIVER BUBBLE (Framer Motion) */}
      <AnimatePresence>
        {selectedDriver && role === 'PASSENGER' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 35 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 25 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            className="absolute bottom-24 left-4 right-4 z-50 pointer-events-auto max-w-sm mx-auto"
          >
            <div className="relative p-4 rounded-3xl bg-surface/95 backdrop-blur-xl border-2 border-gold-primary/60 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(244,197,66,0.25)] text-white overflow-hidden space-y-3">
              
              {/* Gold Shimmer Ambient Aura */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-gold-primary/15 rounded-full blur-2xl pointer-events-none" />

              {/* TOP HEADER: Prominent Motorcycle Model & Plate Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-border-custom/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-gold-primary/20 via-gold-primary/10 to-transparent border border-gold-primary/50 flex items-center justify-center text-gold-primary shadow-inner">
                    <Bike className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gold-primary uppercase tracking-widest block">
                      Modelo de Mototaxi
                    </span>
                    <h4 className="text-sm font-black text-white tracking-wide">
                      {selectedDriver.motorcycle || 'Honda Wave 110'}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-surface-2 border border-gold-primary/40 font-mono text-xs font-black text-gold-light tracking-wider shadow-sm">
                    {selectedDriver.plate || 'RBT-100'}
                  </span>
                  <button
                    onClick={() => {
                      haptics.selection();
                      setSelectedDriverId(null);
                    }}
                    className="w-7 h-7 rounded-full bg-surface-2 hover:bg-gold-primary/20 text-text-secondary hover:text-white flex items-center justify-center transition active:scale-90"
                    title="Cerrar burbuja"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DRIVER INFO: Avatar, Name, Rating, Trips */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img 
                    src={selectedDriver.avatar || '/logo.png'} 
                    alt={selectedDriver.name} 
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-gold-primary/50 shadow-md"
                  />
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-surface absolute -bottom-0.5 -right-0.5 shadow-sm" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-sm text-white truncate">{selectedDriver.name}</h5>
                    <ShieldCheck className="w-4 h-4 text-gold-primary shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1 text-gold-primary font-bold">
                      <Star className="w-3.5 h-3.5 fill-gold-primary" />
                      <span>{selectedDriver.rating ? selectedDriver.rating.toFixed(1) : '5.0'}</span>
                    </span>
                    <span>•</span>
                    <span>{selectedDriver.trips || 12} viajes</span>
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

              {/* ACTION: Pedir viaje directamente o seleccionar para destino */}
              <button
                onClick={() => {
                  haptics.heavy();
                  audio.tabClick();
                  setSelectedDriverId(null);
                  setPassengerState('LOCATION_READY');
                }}
                className="w-full py-2.5 rounded-2xl bg-gold-primary hover:bg-gold-light text-background font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-gold-primary/25 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-background" />
                <span>Pedir viaje con {selectedDriver.name.split(' ')[0]}</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
