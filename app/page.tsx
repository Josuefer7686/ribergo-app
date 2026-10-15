'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  // Firebase Auth session observer
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data() as any;
            // Solo auto-iniciar en arranque en frío (SPLASH). Si el usuario está iniciando sesión con Google en LOGIN/REGISTER,
            // permitimos que el flujo interactivo muestre la selección de rol (Pasajero / Conductor)
            const current = useAppStore.getState().currentView;
            if (current === 'SPLASH') {
              loginUser(profileData);
            }
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
          setCurrentView('MAIN_APP');
        } else {
          setCurrentView('LOGIN');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentView, setCurrentView]);

  // Auto Fullscreen on first user touch/click
  const handleUserInteraction = () => {
    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <main 
      onClick={handleUserInteraction}
      onTouchStart={handleUserInteraction}
      className="w-full h-full h-[100dvh] relative bg-background text-white flex flex-col overflow-hidden select-none"
    >
      {currentView === 'SPLASH' && <SplashView />}
      {currentView === 'LOGIN' && <LoginView />}
      {currentView === 'REGISTER' && <RegisterView />}
      {currentView === 'ROLE_SELECTION' && <RoleSelectionView />}
      {currentView === 'MAIN_APP' && <MainAppView />}

      <SmartPwaInstallModal />
    </main>
  );
}
