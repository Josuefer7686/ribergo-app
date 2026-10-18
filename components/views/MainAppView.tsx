'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { PassengerHome } from '@/components/views/PassengerHome';
import { DriverHome } from '@/components/views/DriverHome';
import { ProfileView } from '@/components/views/ProfileView';
import { TripsView } from '@/components/views/TripsView';
import { MessagesView } from '@/components/views/MessagesView';
import { IncomeView } from '@/components/views/IncomeView';
import { IosMessageToast, ToastMessageData } from '@/components/shared/IosMessageToast';
import { IosLocationPermissionModal } from '@/components/modals/IosLocationPermissionModal';
import { useAutoLocation } from '@/hooks/useAutoLocation';
import { apiService } from '@/services/apiService';

export function MainAppView() {
  const { role, activeTab, setActiveTab, activeTrip, assignedDriver, passengerState, driverState } = useAppStore();
  const [activeToast, setActiveToast] = useState<ToastMessageData | null>(null);
  const lastProcessedMsgId = useRef<string | null>(null);

  const activeTripRef = useRef(activeTrip);
  const assignedDriverRef = useRef(assignedDriver);
  const isInsideChat = 
    activeTab === 'MESSAGES' || 
    (role === 'PASSENGER' && passengerState === 'NEGOTIATING') || 
    (role === 'DRIVER' && driverState === 'NEGOTIATING');
  const isInsideChatRef = useRef(isInsideChat);

  useEffect(() => {
    activeTripRef.current = activeTrip;
    assignedDriverRef.current = assignedDriver;
    isInsideChatRef.current = isInsideChat;
  }, [activeTrip, assignedDriver, isInsideChat]);

  const handleCloseToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Auto-request real GPS location as soon as MainAppView loads
  const { isRequesting, locationError, showPermissionModal, requestLocation } = useAutoLocation();

  const rideId = activeTrip?.id;

  // Real-time listener for incoming messages to show iOS 18 Dynamic Island banner (stable subscription)
  useEffect(() => {
    if (!rideId) {
      lastProcessedMsgId.current = null;
      return;
    }

    const unsubscribe = apiService.subscribeToMessages(rideId, (messages) => {
      if (!messages || messages.length === 0) return;

      const latestMsg = messages[messages.length - 1];
      if (!latestMsg || !latestMsg.text) return;

      const isFromOtherUser = (role === 'PASSENGER' && latestMsg.sender === 'DRIVER') || (role === 'DRIVER' && latestMsg.sender === 'PASSENGER');

      if (isFromOtherUser && latestMsg.id !== lastProcessedMsgId.current) {
        lastProcessedMsgId.current = latestMsg.id;

        // If user is currently NOT inside any chat, show the floating iOS 18 banner
        if (!isInsideChatRef.current) {
          const currentTrip = activeTripRef.current;
          const currentDriver = assignedDriverRef.current;
          setActiveToast({
            id: latestMsg.id,
            senderName: role === 'PASSENGER' ? (currentDriver?.name || currentTrip?.driver?.name || 'Mototaxista RiberGO') : (currentTrip?.passengerName || 'Pasajero RiberGO'),
            senderAvatar: currentDriver?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            text: latestMsg.text,
            time: latestMsg.time || 'Ahora',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [rideId, role]);

  const renderContent = () => {
    switch (activeTab) {
      case 'HOME':
        return role === 'PASSENGER' ? <PassengerHome /> : <DriverHome />;
      case 'TRIPS':
        return <TripsView />;
      case 'MESSAGES':
        return <MessagesView />;
      case 'INCOME':
        return <IncomeView />;
      case 'PROFILE':
        return <ProfileView />;
      default:
        return role === 'PASSENGER' ? <PassengerHome /> : <DriverHome />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-background">
      {/* Floating iOS 18 Dynamic Island Message Toast Banner */}
      <IosMessageToast
        toast={!rideId || isInsideChat ? null : activeToast}
        onClose={handleCloseToast}
        onOpenChat={() => setActiveTab('MESSAGES')}
      />

      {/* Mandatory iOS 18 Location Permission Modal */}
      <IosLocationPermissionModal
        isOpen={showPermissionModal}
        onRequestPermission={requestLocation}
        isRequesting={isRequesting}
        errorMsg={locationError}
      />

      <div className="flex-1 w-full relative overflow-hidden">
        {renderContent()}
      </div>
      <BottomNavigation />
    </div>
  );
}

