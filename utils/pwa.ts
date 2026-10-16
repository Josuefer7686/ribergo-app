/**
 * RIBERGO PWA DETECTION & LIFECYCLE SYSTEM
 * Bulletproof multi-source detection for Android WebAPK/TWA, iOS Safari Home Screen, and Desktop PWA.
 */

import { useState, useEffect } from 'react';

export function checkIsPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Check URL parameters set in manifest.json (start_url: "/?source=pwa")
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get('source') === 'pwa' || 
      urlParams.get('pwa') === 'true' || 
      urlParams.get('utm_source') === 'pwa'
    ) {
      sessionStorage.setItem('ribergo_is_standalone', 'true');
      localStorage.setItem('ribergo_is_installed_pwa', 'true');
      return true;
    }

    // 2. Check session storage (if detected once in the active session, keep it standalone!)
    if (sessionStorage.getItem('ribergo_is_standalone') === 'true') {
      return true;
    }

    // 3. iOS Safari standalone mode (Add to Home Screen)
    if ((navigator as any).standalone === true) {
      sessionStorage.setItem('ribergo_is_standalone', 'true');
      localStorage.setItem('ribergo_is_installed_pwa', 'true');
      return true;
    }

    // 4. Android referrer or TWA/WebAPK package intent
    if (
      document.referrer && 
      (document.referrer.startsWith('android-app://') || document.referrer.includes('android-app:'))
    ) {
      sessionStorage.setItem('ribergo_is_standalone', 'true');
      localStorage.setItem('ribergo_is_installed_pwa', 'true');
      return true;
    }

    // 5. CSS Display Mode Media Queries (standalone, fullscreen, minimal-ui, window-controls-overlay)
    const displayModes = [
      '(display-mode: standalone)',
      '(display-mode: fullscreen)',
      '(display-mode: minimal-ui)',
      '(display-mode: window-controls-overlay)'
    ];

    for (const query of displayModes) {
      if (window.matchMedia && window.matchMedia(query).matches) {
        sessionStorage.setItem('ribergo_is_standalone', 'true');
        localStorage.setItem('ribergo_is_installed_pwa', 'true');
        return true;
      }
    }

    // 6. Check if localStorage previously recorded that this app was installed
    if (localStorage.getItem('ribergo_is_installed_pwa') === 'true') {
      // Only treat as browser if explicitly matching (display-mode: browser)
      const isExplicitBrowser = window.matchMedia && window.matchMedia('(display-mode: browser)').matches;
      if (!isExplicitBrowser) {
        sessionStorage.setItem('ribergo_is_standalone', 'true');
        return true;
      }
    }
  } catch (e) {
    console.warn('PWA standalone detection error:', e);
  }

  return false;
}

export function usePwa() {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkIsPwaStandalone());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
      const active = checkIsPwaStandalone();
      setIsStandalone(active);
    };

    // Update after initial mount / hydration
    updateStatus();
    const timer = setTimeout(updateStatus, 350);

    // Listen to media query changes (e.g. window mode transitions)
    const queries = [
      '(display-mode: standalone)',
      '(display-mode: fullscreen)',
      '(display-mode: minimal-ui)',
      '(display-mode: browser)'
    ];

    const mqls = queries.map(q => (window.matchMedia ? window.matchMedia(q) : null));
    mqls.forEach(mql => {
      mql?.addEventListener?.('change', updateStatus);
    });

    // Native appinstalled event
    const handleAppInstalled = () => {
      localStorage.setItem('ribergo_is_installed_pwa', 'true');
      localStorage.setItem('ribergo_hide_install_prompt', 'true');
      sessionStorage.setItem('ribergo_is_standalone', 'true');
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      mqls.forEach(mql => {
        mql?.removeEventListener?.('change', updateStatus);
      });
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { isStandalone };
}
