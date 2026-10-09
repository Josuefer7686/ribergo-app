'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, LocationPoint } from '@/store/useAppStore';

export function useAutoLocation() {
  const { currentLocation, setCurrentLocation, gpsPermission, setGpsPermission } = useAppStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    setIsRequesting(true);
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setGpsPermission('denied');
      setLocationError('Tu navegador no cuenta con soporte para geolocalización GPS.');
      setShowPermissionModal(true);
      setIsRequesting(false);
      return;
    }

    // Attempt to acquire real device GPS coordinates
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LocationPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'Mi Ubicación Actual',
          address: 'GPS en Vivo',
        };

        setCurrentLocation(coords);
        setGpsPermission('granted');
        setLocationError(null);
        setShowPermissionModal(false);
        setIsRequesting(false);
      },
      (error) => {
        console.warn('Geolocation acquisition failed:', error.message);
        setGpsPermission('denied');
        
        let userFriendlyMsg = 'No pudimos acceder a tu GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          userFriendlyMsg = 'Denegaste el permiso de ubicación o el navegador bloqueó la solicitud en conexión HTTP.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          userFriendlyMsg = 'Tu señal de GPS no está disponible en este momento.';
        } else if (error.code === error.TIMEOUT) {
          userFriendlyMsg = 'La solicitud de GPS tardó demasiado tiempo en responder.';
        }

        setLocationError(userFriendlyMsg);
        setShowPermissionModal(true);
        setIsRequesting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [setCurrentLocation, setGpsPermission]);

  // Automatically request GPS as soon as app/component mounts
  useEffect(() => {
    // If we don't have granted GPS permission or haven't acquired coordinates yet
    if (gpsPermission !== 'granted' || !currentLocation || currentLocation.name === 'Plaza Principal (Riberalta)') {
      requestLocation();
    }
  }, [gpsPermission, currentLocation, requestLocation]);

  return {
    currentLocation,
    isRequesting,
    locationError,
    showPermissionModal,
    requestLocation,
    closePermissionModal: () => setShowPermissionModal(false),
  };
}
