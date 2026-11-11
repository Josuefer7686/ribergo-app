'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { SplashView } from '@/components/views/SplashView';
import { LoginView } from '@/components/views/LoginView';
import { RegisterView } from '@/components/views/RegisterView';
import { RoleSelectionView } from '@/components/views/RoleSelectionView';
import { MainAppView } from '@/components/views/MainAppView';
import dynamic from 'next/dynamic';
import { SmartPwaInstallModal } from '@/components/modals/SmartPwaInstallModal';

export default function App() {
  const { currentView, setCurrentView, user, loginUser } = useAppStore();

  // Register Service Worker and actively check for updates to refresh installed PWAs
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Trigger active update check immediately upon opening the app
        registration.update();
      }).catch((err) => {
        console.warn('SW registration failed:', err);
      });

      // When the new Service Worker activates and claims control, reload to show new logo & code
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        // Nunca recargar en medio de un viaje: se aplica al terminar o al abrir la app de nuevo.
        const { activeTrip, passengerState, driverState } = useAppStore.getState();
        const inTrip = Boolean(activeTrip) || (passengerState !== 'IDLE' && passengerState !== 'LOCATION_READY' && passengerState !== 'LOCATION_LOADING') || !['OFFLINE', 'ONLINE', 'TRIP_COMPLETED'].includes(driverState);
        // Tampoco mientras el conductor completa su registro (fotos en curso)
        const busy = (window as unknown as { __ribergoBusy?: number }).__ribergoBusy ?? 0;
        if (inTrip || busy > 0) return;
        refreshing = true;
        window.location.reload();
      });
    }
  }, []);

  // Firebase Auth session observer
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    // La primera respuesta de Firebase es la de "al abrir la app": solo ahí se comprueba que la
    // cuenta siga existiendo, así nunca se expulsa a alguien que se está registrando.
    let isBoot = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const state = useAppStore.getState();
      const boot = isBoot;
      isBoot = false;
      if (boot) {
        // Reinicio general: la sesión de Firebase de antes de la nueva época se cierra
        if (firebaseUser && state.resetNotice) {
          await signOut(auth).catch(() => {});
          return;
        }
        // La cuenta guardada en el teléfono ya no existe (borrada de la base de datos)
        if (!firebaseUser && state.user) {
          state.forceReset();
          return;
        }
      }
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data() as any;
            const current = useAppStore.getState().currentView;
            if (current === 'SPLASH') {
              const cleanPhone = (profileData.phone || '').replace(/[^0-9]/g, '');
              const hasPhone = cleanPhone.length >= 8 && cleanPhone !== '59170000000';
              const hasRole = profileData.hasSelectedRole === true || (Boolean(profileData.role) && hasPhone);
              loginUser(profileData, hasRole ? 'MAIN_APP' : 'ROLE_SELECTION');
            }
          } else if (boot) {
            // Hay sesión pero su perfil ya no está en la base de datos: se cierra
            await signOut(auth).catch(() => {});
            useAppStore.getState().forceReset();
          }
        } catch (e) {
          console.warn('Error rehydrating Firebase session:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [loginUser]);

  useEffect(() => {
    // Simulate Splash Screen delay and redirect based on login session
    if (currentView === 'SPLASH') {
      const timer = setTimeout(() => {
        const activeUser = useAppStore.getState().user;
        if (activeUser) {
          const cleanPhone = (activeUser.phone || '').replace(/[^0-9]/g, '');
          const hasPhone = cleanPhone.length >= 8 && cleanPhone !== '59170000000';
          const hasRole = activeUser.hasSelectedRole === true || (Boolean(activeUser.role) && hasPhone);
          if (hasRole) {
            setCurrentView('MAIN_APP');
          } else {
            setCurrentView('ROLE_SELECTION');
          }
        } else {
          setCurrentView('LOGIN');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentView, setCurrentView]);

  return (
    <main className="w-full h-full h-[100dvh] relative bg-background text-white flex flex-col overflow-hidden select-none">
      {currentView === 'SPLASH' && <SplashView />}
      {currentView === 'LOGIN' && <LoginView />}
      {currentView === 'REGISTER' && <RegisterView />}
      {currentView === 'ROLE_SELECTION' && <RoleSelectionView />}
      {currentView === 'MAIN_APP' && <MainAppView />}

      <SmartPwaInstallModal />
    </main>
  );
}
