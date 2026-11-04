'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/store/useAppStore';
import { DriverData } from '@/services/mockData';
import { apiService } from '@/services/apiService';
import { Bike } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

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
      <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <!-- Directional Pointer Arrow (Points to heading direction) -->
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: rotate(${rotation}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;">
          <div style="position: absolute; top: -8px; width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 11px solid #F4C542; filter: drop-shadow(0 0 6px rgba(244,197,66,0.95));"></div>
        </div>

        <!-- Ambient Golden Pulse Ring -->
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(244,197,66,0.25); ${isMoving || active ? 'animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;' : ''} pointer-events: none;"></div>

        <!-- Inner Mototaxi Bubble with smooth rotation -->
        <div style="width: 38px; height: 38px; background: #05080B; border: 2.5px solid ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.85), 0 0 ${active ? '18px rgba(244,197,66,0.9)' : '10px rgba(244,197,66,0.45)'}; transform: scale(${active ? 1.15 : 1}); transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); pointer-events: none;">
          <div style="transform: rotate(${rotation}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; pointer-events: none;">
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
    iconAnchor: [23, 23]
  });
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });
  return null;
}

function MapUpdater({ 
  centerLat, 
  centerLng, 
  destination,
  selectedDriverLocation,
  recenterTrigger = 0,
}: { 
  centerLat: number;
  centerLng: number;
  destination?: [number, number] | null;
  selectedDriverLocation?: [number, number] | null;
  recenterTrigger?: number;
}) {
  const map = useMap();
  const prevCenterRef = useRef<string>('');
  const prevDestRef = useRef<string>('');
  const prevRecenterRef = useRef<number>(recenterTrigger);
  const hasInitializedRef = useRef<boolean>(false);
  const isDefaultPlaza = Math.abs(centerLat - (-11.0061)) < 0.0001 && Math.abs(centerLng - (-66.0747)) < 0.0001;
  const prevIsDefaultRef = useRef<boolean>(isDefaultPlaza);

  // Invalidate map size once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // Center smoothly on initial load or when destination bounds change
  useEffect(() => {
    const centerKey = `${centerLat.toFixed(5)},${centerLng.toFixed(5)}`;
    const destKey = destination ? `${destination[0].toFixed(5)},${destination[1].toFixed(5)}` : '';

    if (destination) {
      if (prevDestRef.current !== destKey) {
        prevDestRef.current = destKey;
        const bounds = L.latLngBounds([[centerLat, centerLng], destination]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    } else if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevCenterRef.current = centerKey;
      map.setView([centerLat, centerLng], 15, { animate: false });
    }
  }, [centerLat, centerLng, destination, map]);

  // If initial load was default plaza, fly to user location when real GPS is first received
  useEffect(() => {
    if (prevIsDefaultRef.current && !isDefaultPlaza) {
      prevIsDefaultRef.current = false;
      map.stop();
      try {
        map.flyTo([centerLat, centerLng], 16, { animate: true, duration: 0.8 });
      } catch {
        map.setView([centerLat, centerLng], 16, { animate: true });
      }
    }
  }, [centerLat, centerLng, isDefaultPlaza, map]);

  // Recenter map immediately on custom event (0ms latency, bypasses any React state delays)
  useEffect(() => {
    const handleRecenter = (e?: any) => {
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
  }, [map]);

  // Smoothly fly to user location whenever recenterTrigger changes
  useEffect(() => {
    if (recenterTrigger > 0) {
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
  }, [recenterTrigger, map]);

  // Smoothly pan towards selected driver if tapped
  useEffect(() => {
    if (selectedDriverLocation) {
      map.stop();
      map.panTo(selectedDriverLocation, { animate: true, duration: 0.45 });
    }
  }, [selectedDriverLocation?.[0], selectedDriverLocation?.[1], map]);

  return null;
}

export default function MapComponent() {
  const { 
    currentLocation, destination, role, passengerState, driverState, 
    assignedDriver, onlineDrivers, setOnlineDrivers,
    selectedDriverId, setSelectedDriverId,
    mapRecenterTrigger
  } = useAppStore();

  // Check if destination is "Acordar en persona"
  const isInPersonDestination = !destination || (destination as any).id === 'in-person' || destination.name?.toLowerCase().includes('acordar');

  // Subscribe to real-time online drivers from Hybrid SyncBus & Firestore
  useEffect(() => {
    const unsubscribe = apiService.subscribeToOnlineDrivers((drivers) => {
      setOnlineDrivers(drivers);
    });
    return () => unsubscribe();
  }, [setOnlineDrivers]);

  // Only real online drivers (100% real, no bots/mocks)
  const activeDriversList: DriverData[] = onlineDrivers;

  // Real assigned driver live location lookup from onlineDrivers
  const liveAssignedDriver = activeDriversList.find((d) => d.id === assignedDriver?.id) || assignedDriver;

  // Selected driver coordinate for smooth auto-centering
  const selectedDriver = activeDriversList.find((d) => d.id === selectedDriverId) || null;

  const selectedDriverLocation: [number, number] | null = selectedDriver?.currentLocation 
    ? [selectedDriver.currentLocation.lat, selectedDriver.currentLocation.lng] 
    : null;

  const centerLat = currentLocation ? currentLocation.lat : -11.0061;
  const centerLng = currentLocation ? currentLocation.lng : -66.0747;
  const center = useMemo<[number, number]>(() => [centerLat, centerLng], [centerLat, centerLng]); 

  // Only define destination coordinates if NOT "Acordar en persona"
  const destPoint: [number, number] | null = (destination && !isInPersonDestination)
    ? [destination.lat, destination.lng]
    : null;

  // Active trip state check
  const isTripActive = (role === 'PASSENGER' && (passengerState === 'CONFIRMING' || passengerState === 'SEARCHING_DRIVER' || passengerState === 'DRIVER_FOUND' || passengerState === 'TRIP_STARTED')) ||
                       (role === 'DRIVER' && (driverState === 'RIDE_REQUEST' || driverState === 'GOING_TO_PASSENGER' || driverState === 'TRIP_STARTED'));

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
        <MapUpdater 
          centerLat={centerLat} 
          centerLng={centerLng} 
          destination={isTripActive && !isInPersonDestination ? destPoint : null} 
          selectedDriverLocation={selectedDriverLocation}
          recenterTrigger={mapRecenterTrigger}
        />
        <MapClickHandler onMapClick={() => setSelectedDriverId(null)} />
        
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

        {/* Real Assigned Driver Live Location during Active Trip (100% Real-time GPS movement) */}
        {role === 'PASSENGER' && (passengerState === 'DRIVER_FOUND' || passengerState === 'NEGOTIATING' || passengerState === 'TRIP_STARTED') && liveAssignedDriver?.currentLocation && (
          <Marker 
            key={liveAssignedDriver.id || 'assigned_driver'} 
            position={[liveAssignedDriver.currentLocation.lat, liveAssignedDriver.currentLocation.lng]} 
            icon={getMotoIcon(true, liveAssignedDriver.heading || 0, (liveAssignedDriver.speed || 0) > 0)} 
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
                    icon={getMotoIcon(isSelected || isAssigned, heading, isMoving)}
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
