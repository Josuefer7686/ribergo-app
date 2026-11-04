'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/store/useAppStore';
import { DriverData } from '@/services/mockData';
import { apiService } from '@/services/apiService';
import { Bike, Navigation } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { fetchLiveRoute } from '@/utils/routing';

// Fix Leaflet default icon paths
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function getZoomScale(zoom: number): number {
  if (zoom >= 19) return 0.65;
  if (zoom >= 18) return 0.75;
  if (zoom >= 17) return 0.85;
  if (zoom >= 16) return 0.92;
  return 1.0;
}

function getUserIcon(scale = 1.0) {
  return new L.DivIcon({
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transform: scale(${scale}); transform-origin: center center;">
        <div style="position: absolute; inset: -8px; background: rgba(244,197,66,0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width: 22px; height: 22px; background: #F4C542; border: 3px solid #05080B; border-radius: 50%; box-shadow: 0 0 14px rgba(244,197,66,0.85);"></div>
      </div>
    `,
    className: 'custom-user-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function getPassengerPickupIcon(isRescue = false, scale = 1.0) {
  const color = isRescue ? '#F97316' : '#38BDF8';
  return new L.DivIcon({
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transform: scale(${scale}); transform-origin: center center;">
        <div style="position: absolute; inset: -6px; background: ${isRescue ? 'rgba(249,115,22,0.35)' : 'rgba(56,189,248,0.35)'}; border-radius: 50%; animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width: 28px; height: 28px; background: #05080B; border: 2.5px solid ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px ${isRescue ? 'rgba(249,115,22,0.85)' : 'rgba(56,189,248,0.85)'};">
          ${isRescue 
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
          }
        </div>
      </div>
    `,
    className: 'custom-pickup-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function getDestIcon(scale = 1.0) {
  return new L.DivIcon({
    html: `
      <div style="width: 26px; height: 26px; background: #05080B; border: 3px solid #F4C542; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(244,197,66,0.7); transform: scale(${scale}); transform-origin: center center;">
        <div style="width: 8px; height: 8px; background: #F4C542; border-radius: 50%;"></div>
      </div>
    `,
    className: 'custom-dest-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Creates dynamic mototaxi marker with:
 * - Directional pointer cone showing heading
 * - Rotated motorcycle icon
 * - Ambient pulse ring
 * - Responsive zoom scale (doesn't occlude buildings when zooming in)
 */
function getMotoIcon(active = false, heading = 0, isMoving = false, scale = 1.0) {
  const bgColor = active ? '#FFE885' : '#F4C542';
  const rotation = heading || 0;
  
  return new L.DivIcon({
    html: `
      <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: scale(${scale}); transform-origin: center center;">
        <!-- Directional Pointer Arrow -->
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(${rotation}deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;">
          <div style="position: absolute; top: -8px; width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 11px solid #F4C542; filter: drop-shadow(0 0 6px rgba(244,197,66,0.95));"></div>
        </div>

        <!-- Ambient Golden Pulse Ring -->
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(244,197,66,0.25); ${isMoving || active ? 'animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;' : ''} pointer-events: none;"></div>

        <!-- Inner Mototaxi Bubble -->
        <div style="width: 38px; height: 38px; background: #05080B; border: 2.5px solid ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.85), 0 0 ${active ? '18px rgba(244,197,66,0.9)' : '10px rgba(244,197,66,0.45)'}; transform: scale(${active ? 1.15 : 1}); pointer-events: none;">
          <div style="transform: rotate(${rotation}deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${bgColor}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6h2l3 5v5h-2"/>
              <path d="M5.5 17.5L9 9h5l2.5 5"/>
            </svg>
          </div>
        </div>

        <!-- Online Green Status Indicator Dot -->
        <div style="position: absolute; bottom: 1px; right: 1px; width: 11px; height: 11px; background: #10B981; border: 2px solid #05080B; border-radius: 50%; box-shadow: 0 0 6px #10B981; pointer-events: none;"></div>
      </div>
    `,
    className: 'custom-moto-marker-interactive',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

function MapInteractionTracker({ 
  onMapClick, 
  onUserInteraction,
  onZoomChange 
}: { 
  onMapClick: () => void; 
  onUserInteraction: () => void;
  onZoomChange: (z: number) => void;
}) {
  useMapEvents({
    click: () => onMapClick(),
    dragstart: () => onUserInteraction(),
    zoomstart: () => onUserInteraction(),
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  });
  return null;
}

/**
 * MapUpdater handles framing and user-initiated centering:
 * 1. Initial framing on startup.
 * 2. Automatic framing ONCE when a new trip phase begins (e.g. RIDE_REQUEST or TRIP_STARTED).
 * 3. NEVER automatically hijacks or snaps the camera back while the user is panning/zooming.
 * 4. Recenter button explicitly flies back to user position.
 */
function MapUpdater({ 
  centerLat, 
  centerLng, 
  selectedDriverLocation,
  recenterTrigger = 0,
  routeBounds = null,
  tripPhaseKey = '',
  userInteractedRef,
}: { 
  centerLat: number;
  centerLng: number;
  selectedDriverLocation?: [number, number] | null;
  recenterTrigger?: number;
  routeBounds?: [[number, number], [number, number]] | null;
  tripPhaseKey?: string;
  userInteractedRef: React.MutableRefObject<boolean>;
}) {
  const map = useMap();
  const hasInitializedRef = useRef<boolean>(false);
  const prevTripPhaseRef = useRef<string>('');
  const isDefaultPlaza = Math.abs(centerLat - (-11.0061)) < 0.0001 && Math.abs(centerLng - (-66.0747)) < 0.0001;
  const hasAcquiredRealGpsRef = useRef<boolean>(!isDefaultPlaza);

  // Invalidate map size once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  // Initial load: center on coordinates once
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      map.setView([centerLat, centerLng], 15, { animate: false });
    }
  }, [centerLat, centerLng, map]);

  // First time real GPS is acquired (if app mounted before geolocation resolved)
  useEffect(() => {
    if (!hasAcquiredRealGpsRef.current && !isDefaultPlaza && !userInteractedRef.current) {
      hasAcquiredRealGpsRef.current = true;
      try {
        map.flyTo([centerLat, centerLng], 16, { animate: true, duration: 0.8 });
      } catch {
        map.setView([centerLat, centerLng], 16);
      }
    }
  }, [centerLat, centerLng, isDefaultPlaza, map, userInteractedRef]);

  // Frame route ONCE when a new trip state starts (e.g., incoming ride request or trip started)
  useEffect(() => {
    if (tripPhaseKey && tripPhaseKey !== prevTripPhaseRef.current) {
      prevTripPhaseRef.current = tripPhaseKey;
      if (routeBounds) {
        userInteractedRef.current = false;
        map.stop();
        map.fitBounds(routeBounds, { padding: [70, 70], maxZoom: 16 });
      }
    }
  }, [tripPhaseKey, routeBounds, map, userInteractedRef]);

  // Recenter map immediately on custom event (fired by "Mi Ubicación" button)
  useEffect(() => {
    const handleRecenter = (e?: any) => {
      userInteractedRef.current = false;
      const state = useAppStore.getState();
      const targetLat = e?.detail?.lat ?? state.currentLocation?.lat ?? -11.0061;
      const targetLng = e?.detail?.lng ?? state.currentLocation?.lng ?? -66.0747;
      
      map.stop();
      map.invalidateSize();
      try {
        map.flyTo([targetLat, targetLng], 16, { animate: true, duration: 0.7 });
      } catch {
        map.setView([targetLat, targetLng], 16, { animate: true });
      }
    };

    window.addEventListener('ribergo:recenter_map', handleRecenter);
    return () => window.removeEventListener('ribergo:recenter_map', handleRecenter);
  }, [map, userInteractedRef]);

  // Fly to user location when recenterTrigger prop increments
  useEffect(() => {
    if (recenterTrigger > 0) {
      userInteractedRef.current = false;
      const state = useAppStore.getState();
      const targetLat = state.currentLocation?.lat ?? centerLat;
      const targetLng = state.currentLocation?.lng ?? centerLng;
      map.stop();
      map.invalidateSize();
      try {
        map.flyTo([targetLat, targetLng], 16, { animate: true, duration: 0.7 });
      } catch {
        map.setView([targetLat, targetLng], 16, { animate: true });
      }
    }
  }, [recenterTrigger, map, centerLat, centerLng, userInteractedRef]);

  // Smoothly pan towards selected driver if tapped
  useEffect(() => {
    if (selectedDriverLocation) {
      map.stop();
      map.panTo(selectedDriverLocation, { animate: true, duration: 0.45 });
    }
  }, [selectedDriverLocation, map]);

  return null;
}

export default function MapComponent() {
  const { 
    currentLocation, destination, role, passengerState, driverState, 
    assignedDriver, onlineDrivers, setOnlineDrivers,
    selectedDriverId, setSelectedDriverId,
    mapRecenterTrigger, activeTrip, urbanServiceType,
    pendingRequest
  } = useAppStore();

  const [currentZoom, setCurrentZoom] = useState<number>(15);
  const userInteractedRef = useRef<boolean>(false);

  // Service type: MOTOTAXI or REMOLCADA / AUXILIO
  const serviceType = activeTrip?.serviceType || pendingRequest?.serviceType || urbanServiceType || 'MOTOTAXI';
  const isRescue = serviceType === 'REMOLCADA';

  // Subscribe to real-time online drivers from Hybrid SyncBus & Firestore
  useEffect(() => {
    const unsubscribe = apiService.subscribeToOnlineDrivers((drivers) => {
      setOnlineDrivers(drivers);
    });
    return () => unsubscribe();
  }, [setOnlineDrivers]);

  // Real online drivers list
  const activeDriversList: DriverData[] = onlineDrivers;

  // Real assigned driver lookup
  const liveAssignedDriver = activeDriversList.find((d) => d.id === assignedDriver?.id) || assignedDriver;

  // Selected driver coordinate for map pan
  const selectedDriver = activeDriversList.find((d) => d.id === selectedDriverId) || null;
  const selectedDriverLocation: [number, number] | null = selectedDriver?.currentLocation 
    ? [selectedDriver.currentLocation.lat, selectedDriver.currentLocation.lng] 
    : null;

  const centerLat = currentLocation ? currentLocation.lat : -11.0061;
  const centerLng = currentLocation ? currentLocation.lng : -66.0747;
  const center = useMemo<[number, number]>(() => [centerLat, centerLng], [centerLat, centerLng]); 

  // =========================================================================
  // DYNAMIC ROUTE DETERMINATION
  // =========================================================================
  let routeOrigin: [number, number] | null = null;
  let routeTarget: [number, number] | null = null;
  let tripPhaseKey = '';

  if (role === 'PASSENGER') {
    if (passengerState === 'CONFIRMING' && currentLocation && destination?.lat && destination?.lng) {
      // Pre-booking route preview
      routeOrigin = [currentLocation.lat, currentLocation.lng];
      routeTarget = [destination.lat, destination.lng];
      tripPhaseKey = `passenger_confirming_${destination.lat}_${destination.lng}`;
    } else if ((passengerState === 'DRIVER_FOUND' || passengerState === 'NEGOTIATING') && liveAssignedDriver?.currentLocation) {
      // Assigned driver is heading to passenger's pickup spot
      routeOrigin = [liveAssignedDriver.currentLocation.lat, liveAssignedDriver.currentLocation.lng];
      routeTarget = currentLocation 
        ? [currentLocation.lat, currentLocation.lng] 
        : (activeTrip?.pickup ? [activeTrip.pickup.lat, activeTrip.pickup.lng] : null);
      tripPhaseKey = `passenger_driver_coming_${activeTrip?.id || ''}`;
    } else if (passengerState === 'TRIP_STARTED') {
      // Passenger picked up! Route towards destination
      const dest = activeTrip?.destination || destination;
      if (dest?.lat && dest?.lng) {
        routeOrigin = liveAssignedDriver?.currentLocation 
          ? [liveAssignedDriver.currentLocation.lat, liveAssignedDriver.currentLocation.lng]
          : (currentLocation ? [currentLocation.lat, currentLocation.lng] : null);
        routeTarget = [dest.lat, dest.lng];
        tripPhaseKey = `passenger_trip_started_${activeTrip?.id || ''}`;
      }
    }
  } else if (role === 'DRIVER') {
    if (driverState === 'RIDE_REQUEST' && pendingRequest?.pickup && currentLocation) {
      // 🌟 DRIVER SEES INCOMING TRIP: Trace route from driver's GPS to passenger pickup!
      routeOrigin = [currentLocation.lat, currentLocation.lng];
      routeTarget = [pendingRequest.pickup.lat, pendingRequest.pickup.lng];
      tripPhaseKey = `driver_request_${pendingRequest.id}`;
    } else if ((driverState === 'GOING_TO_PASSENGER' || activeTrip?.status === 'GOING_TO_PASSENGER' || activeTrip?.status === 'NEGOTIATING') && activeTrip?.pickup && currentLocation) {
      // Driver accepted and is navigating to passenger's pickup location
      routeOrigin = [currentLocation.lat, currentLocation.lng];
      routeTarget = [activeTrip.pickup.lat, activeTrip.pickup.lng];
      tripPhaseKey = `driver_going_to_pickup_${activeTrip.id}`;
    } else if (driverState === 'TRIP_STARTED' && currentLocation) {
      // 🌟 TRIP STARTED: Driver picked up passenger, route stays visible all the way to destination!
      const tripDest = activeTrip?.destination || destination;
      if (tripDest?.lat && tripDest?.lng) {
        routeOrigin = [currentLocation.lat, currentLocation.lng];
        routeTarget = [tripDest.lat, tripDest.lng];
        tripPhaseKey = `driver_trip_started_${activeTrip?.id || ''}`;
      }
    }
  }

  // Live street turn-by-turn route state
  const [liveRoutePoints, setLiveRoutePoints] = useState<[number, number][]>([]);

  // Coordinate key rounded to 4 decimals (~11m) to trigger recalculation on movement & deviation
  const originKey = routeOrigin ? `${routeOrigin[0].toFixed(4)},${routeOrigin[1].toFixed(4)}` : '';
  const targetKey = routeTarget ? `${routeTarget[0].toFixed(4)},${routeTarget[1].toFixed(4)}` : '';

  useEffect(() => {
    let isMounted = true;

    if (!routeOrigin || !routeTarget) {
      Promise.resolve().then(() => {
        if (isMounted) setLiveRoutePoints([]);
      });
      return () => {
        isMounted = false;
      };
    }

    const startPoint = routeOrigin;
    const endPoint = routeTarget;

    fetchLiveRoute(startPoint[0], startPoint[1], endPoint[0], endPoint[1])
      .then((points) => {
        if (isMounted) {
          setLiveRoutePoints(points);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLiveRoutePoints([startPoint, endPoint]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [originKey, targetKey, routeOrigin, routeTarget]);

  // Route bounds for auto-framing on initial transition
  const routeBounds: [[number, number], [number, number]] | null = 
    (routeOrigin && routeTarget) ? [routeOrigin, routeTarget] : null;

  // Dynamic zoom scale factor for markers
  const markerScale = getZoomScale(currentZoom);

  return (
    <div className="w-full h-full absolute inset-0 z-0 overflow-hidden">
      <MapContainer 
        center={center} 
        zoom={15} 
        minZoom={12}
        maxZoom={19}
        scrollWheelZoom={true} 
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
        />
        <MapUpdater 
          centerLat={centerLat} 
          centerLng={centerLng} 
          selectedDriverLocation={selectedDriverLocation}
          recenterTrigger={mapRecenterTrigger}
          routeBounds={routeBounds}
          tripPhaseKey={tripPhaseKey}
          userInteractedRef={userInteractedRef}
        />
        <MapInteractionTracker 
          onMapClick={() => setSelectedDriverId(null)} 
          onUserInteraction={() => {
            userInteractedRef.current = true;
          }}
          onZoomChange={(newZoom) => setCurrentZoom(newZoom)}
        />
        
        {/* User / Driver Live Location */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]} 
            icon={role === 'DRIVER' ? getMotoIcon(true, currentLocation.heading || 0, true, markerScale) : getUserIcon(markerScale)} 
          />
        )}

        {/* Incoming Trip Request Pickup Marker for Driver */}
        {role === 'DRIVER' && driverState === 'RIDE_REQUEST' && pendingRequest?.pickup && (
          <Marker 
            position={[pendingRequest.pickup.lat, pendingRequest.pickup.lng]} 
            icon={getPassengerPickupIcon(pendingRequest.serviceType === 'REMOLCADA', markerScale)} 
          />
        )}

        {/* Passenger Pickup Location Marker for Driver when en route */}
        {role === 'DRIVER' && (driverState === 'GOING_TO_PASSENGER' || activeTrip?.status === 'GOING_TO_PASSENGER' || activeTrip?.status === 'NEGOTIATING') && activeTrip?.pickup && (
          <Marker 
            position={[activeTrip.pickup.lat, activeTrip.pickup.lng]} 
            icon={getPassengerPickupIcon(isRescue, markerScale)} 
          />
        )}
        
        {/* Destination Location Marker */}
        {((role === 'PASSENGER' && destination?.lat && destination?.lng) || 
          (routeTarget && (passengerState === 'TRIP_STARTED' || driverState === 'TRIP_STARTED'))) && (
          <Marker 
            position={routeTarget || [destination!.lat, destination!.lng]} 
            icon={getDestIcon(markerScale)} 
          />
        )}

        {/* 🌟 LUXURY ANIMATED STREET ROUTE (TURN-BY-TURN & DEVIATION AWARE) */}
        {liveRoutePoints.length >= 2 && (
          <>
            {/* Layer 1: Ambient Glow / Aura Pulse */}
            <Polyline 
              positions={liveRoutePoints}
              pathOptions={{
                color: isRescue ? '#F97316' : '#F4C542',
                weight: 10,
                opacity: 0.38,
                lineCap: 'round',
                lineJoin: 'round',
                className: isRescue ? 'ribergo-route-glow-rescue' : 'ribergo-route-glow-gold'
              }}
            />

            {/* Layer 2: Solid High-Contrast Street Route Line */}
            <Polyline 
              positions={liveRoutePoints}
              pathOptions={{
                color: isRescue ? '#EA580C' : '#F4C542',
                weight: 5,
                opacity: 0.88,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Layer 3: Laser Dash Pulses Flowing in Direction of Travel */}
            <Polyline 
              positions={liveRoutePoints}
              pathOptions={{
                color: isRescue ? '#FFF7ED' : '#FFFFFF',
                weight: 2.8,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                className: isRescue ? 'ribergo-route-flow-rescue' : 'ribergo-route-flow-gold'
              }}
            />
          </>
        )}

        {/* Real Assigned Driver Live Location during Active Trip (Passenger View) */}
        {role === 'PASSENGER' && (passengerState === 'DRIVER_FOUND' || passengerState === 'NEGOTIATING' || passengerState === 'TRIP_STARTED') && liveAssignedDriver?.currentLocation && (
          <Marker 
            key={liveAssignedDriver.id || 'assigned_driver'} 
            position={[liveAssignedDriver.currentLocation.lat, liveAssignedDriver.currentLocation.lng]} 
            icon={getMotoIcon(true, liveAssignedDriver.heading || 0, (liveAssignedDriver.speed || 0) > 0, markerScale)} 
          />
        )}
        
        {/* Real Online Mototaxis on Map with Real-time Heading & Tap Interaction */}
        {role === 'PASSENGER' && (
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
                    icon={getMotoIcon(isSelected || isAssigned, heading, isMoving, markerScale)}
                    eventHandlers={{
                      click: (e) => {
                        L.DomEvent.stopPropagation(e as any);
                        haptics.impact();
                        audio.tabClick();
                        setSelectedDriverId(driver.id);
                      }
                    }}
                  >
                    {isSelected && (
                      <Popup
                        position={[driver.currentLocation.lat, driver.currentLocation.lng]}
                        closeButton={false}
                        autoPan={false}
                        className="custom-leaflet-moto-popup"
                        offset={[0, -28]}
                      >
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#05080B]/95 border-2 border-[#F4C542] text-xs font-black text-white shadow-[0_4px_20px_rgba(244,197,66,0.5)] animate-in fade-in zoom-in-95 duration-200">
                          <Bike className="w-3.5 h-3.5 text-[#F4C542] shrink-0" />
                          <span className="tracking-wide text-white font-extrabold">{driver.name || 'Conductor'}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>En línea</span>
                          </span>
                        </div>
                      </Popup>
                    )}
                  </Marker>
                );
              })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
