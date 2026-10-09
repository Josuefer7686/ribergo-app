'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_DRIVERS } from '@/services/mockData';

// Fix Leaflet icon paths
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
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; inset: -8px; background: rgba(244,197,66,0.3); border-radius: 50%; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width: 24px; height: 24px; background: #F4C542; border: 3px solid #05080B; border-radius: 50%; box-shadow: 0 0 14px rgba(244,197,66,0.8);"></div>
      </div>
    `,
    className: 'custom-user-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function getDestIcon() {
  return new L.DivIcon({
    html: `
      <div style="width: 24px; height: 24px; background: #05080B; border: 3px solid #F4C542; border-radius: 50%; display: flex; items-center; justify-content: center; box-shadow: 0 0 12px rgba(244,197,66,0.6);">
        <div style="width: 8px; height: 8px; background: #F4C542; border-radius: 50%;"></div>
      </div>
    `,
    className: 'custom-dest-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function getMotoIcon(active = false) {
  const bgColor = active ? '#FFD966' : '#F4C542';
  return new L.DivIcon({
    html: `
      <div style="width: 32px; height: 32px; background: ${bgColor}; border: 2px solid #05080B; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.7); transform: scale(${active ? 1.15 : 1}); transition: all 0.3s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#05080B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <path d="M15 6h2l3 5v5h-2"/>
          <path d="M5.5 17.5L9 9h5l2.5 5"/>
        </svg>
      </div>
    `,
    className: 'custom-moto-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
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

import { apiService } from '@/services/apiService';

export default function MapComponent() {
  const { currentLocation, destination, role, passengerState, driverState, assignedDriver, onlineDrivers, setOnlineDrivers } = useAppStore();
  const [animatedMotoPos, setAnimatedMotoPos] = useState<[number, number] | null>(null);

  // Check if destination is "Acordar en persona"
  const isInPersonDestination = !destination || (destination as any).id === 'in-person' || destination.name?.toLowerCase().includes('acordar');

  // Subscribe to real-time online drivers from Firestore
  useEffect(() => {
    const unsubscribe = apiService.subscribeToOnlineDrivers((drivers) => {
      setOnlineDrivers(drivers);
    });
    return () => unsubscribe();
  }, [setOnlineDrivers]);

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

  // Animated mototaxi logic (Driver approaching passenger when DRIVER_FOUND, or riding to destination when TRIP_STARTED)
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
    <div className="w-full h-full absolute inset-0 z-0">
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

        {/* Animated Active Mototaxi */}
        {animatedMotoPos && (
          <Marker position={animatedMotoPos} icon={getMotoIcon(true)} />
        )}
        
        {/* Real Online Mototaxis from Firestore */}
        {!animatedMotoPos && role === 'PASSENGER' && (passengerState === 'IDLE' || passengerState === 'LOCATION_READY' || passengerState === 'SEARCHING_DRIVER') && currentLocation && (
          <>
            {onlineDrivers.map((driver) => (
              <Marker 
                key={driver.id} 
                position={[driver.currentLocation.lat, driver.currentLocation.lng]} 
                icon={getMotoIcon(assignedDriver?.id === driver.id)} 
              />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}
