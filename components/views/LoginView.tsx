'use client';

import { useState, useEffect } from 'react';
import { useAppStore, UserRole, UserProfile } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { Smartphone, User, Bike, AlertCircle, UserPlus, Sparkles } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { ConfirmationResult } from 'firebase/auth';
import { CustomNumericKeypad } from '@/components/shared/CustomNumericKeypad';
import { OtpPinInput } from '@/components/shared/OtpPinInput';
import { IosToastOverlay } from '@/components/shared/IosToastOverlay';
import { IosSpinner } from '@/components/shared/IosSpinner';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const LoginView = () => {
  const { setCurrentView, loginUser, setRole, setPendingRegisterPhone } = useAppStore();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsStep, setSmsStep] = useState<'ENTER_PHONE' | 'ENTER_CODE'>('ENTER_PHONE');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // iOS Toast Overlay States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Cargando...');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('¡Éxito!');
  const [successSubtitle, setSuccessSubtitle] = useState('Sesión iniciada correctamente');
  const [pendingUserProfile, setPendingUserProfile] = useState<UserProfile | null>(null);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Cupertino modal for unregistered user alert
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);

  // Initialize reCAPTCHA on load
  useEffect(() => {
    if (smsStep === 'ENTER_PHONE') {
      const timer = setTimeout(() => {
        apiService.setupRecaptcha('recaptcha-container');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [smsStep]);

  // Handle phone submit
  const handlePhoneSubmit = async () => {
    haptics.heavy();
    setIsLoading(true);
    setLoadingText('Verificando número en RiberGO...');
    setErrorMsg(null);

    const fullPhone = `+591${phoneDigits.trim().replace(/[^0-9]/g, '')}`;

    if (phoneDigits.trim().length < 7) {
      setErrorMsg('Por favor ingresa un número de celular válido de Bolivia (ej. 76868110)');
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Check if user exists in Cloud Firestore
      const { exists } = await apiService.checkUserExistsByPhone(fullPhone);

      if (!exists) {
        // User is not registered!
        setPendingRegisterPhone(phoneDigits);
        setIsLoading(false);
        setShowUnregisteredModal(true);
        return;
      }

      // Step 2: User exists -> Send SMS Code
      setLoadingText('Enviando código SMS de confirmación...');
      const verifier = (window as any).recaptchaVerifier || apiService.setupRecaptcha('recaptcha-container');
      const result = await apiService.sendSmsVerification(fullPhone, verifier);

      setConfirmationResult(result);
      setSmsStep('ENTER_CODE');
    } catch (err: any) {
      console.error('Error enviando SMS:', err);
      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMsg('El número de celular no es válido.');
      } else if (
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('SMS unable to be sent until this region enabled')
      ) {
        setErrorMsg('Servicio SMS de Bolivia (+591) pendiente de habilitar en Firebase Console o usa un Número de Prueba.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMsg('Demasiados intentos de SMS. Usa tu número de prueba en Firebase (código 123456).');
      } else {
        setErrorMsg('Error al enviar SMS: ' + (err?.message || 'Verifica la conexión'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify 6-digit SMS Code
  const handleVerifyCode = async () => {
    haptics.heavy();
    setIsLoading(true);
    setLoadingText('Verificando código de seguridad...');
    setErrorMsg(null);

    if (smsCode.length < 6) {
      setErrorMsg('Por favor ingresa el código completo de 6 dígitos.');
      setIsLoading(false);
      return;
    }

    if (!confirmationResult) {
      setErrorMsg('Sesión de SMS vencida. Intenta nuevamente.');
      setIsLoading(false);
      return;
    }

    try {
      const userProfile = await apiService.confirmSmsCode(confirmationResult, smsCode, {
        role: 'PASSENGER',
      });
      
      setPendingUserProfile(userProfile);
      setIsLoading(false);
      
      // Trigger iOS Success HUD with sound & haptic
      setSuccessTitle('¡Bienvenido!');
      setSuccessSubtitle(`Iniciaste sesión como ${userProfile.name}`);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Error verificando código SMS:', err);
      setIsLoading(false);
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMsg('Código incorrecto. Ingresa los 6 dígitos recibidos por SMS.');
      } else {
        setErrorMsg('Error de verificación: ' + (err?.message || 'Código inválido'));
      }
    }
  };

  // Google Fast Sign-In
  const handleGoogleLogin = async () => {
    haptics.heavy();
    setIsGoogleLoading(true);
    setIsLoading(true);
    setLoadingText('Autenticando con Google...');
    setErrorMsg(null);

    try {
      const userProfile = await apiService.loginWithGoogle();
      setPendingUserProfile(userProfile);
      setIsLoading(false);
      setIsGoogleLoading(false);

      // Trigger iOS Success HUD
      setSuccessTitle('¡Bienvenido!');
      setSuccessSubtitle(`Iniciaste sesión como ${userProfile.name}`);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setIsLoading(false);
      setIsGoogleLoading(false);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Inicio de sesión con Google cancelado.');
      } else {
        setErrorMsg('Error con Google Sign-In: ' + (err?.message || 'Error de red'));
      }
    }
  };

  // Called after iOS Success HUD animation completes (1.4s)
  const handleSuccessFinished = () => {
    if (pendingUserProfile) {
      loginUser(pendingUserProfile);
      if (pendingUserProfile.role) {
        setRole(pendingUserProfile.role);
        setCurrentView('MAIN_APP');
      } else {
        setCurrentView('ROLE_SELECTION');
      }
    }
  };

  const handleGoToRegister = () => {
    haptics.selection();
    setShowUnregisteredModal(false);
    setCurrentView('REGISTER');
  };

  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 text-white relative">
      {/* Invisible Recaptcha container */}
      <div id="recaptcha-container"></div>

      {/* iOS Loading & Success Toast Overlay */}
      <IosToastOverlay
        isLoading={isLoading}
        loadingText={loadingText}
        showSuccess={showSuccess}
        successTitle={successTitle}
        successSubtitle={successSubtitle}
        onSuccessComplete={handleSuccessFinished}
      />

      <div className="pt-safe flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Header Branding */}
        <div className="mb-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-2 border border-gold-primary/30 mb-2 shadow-lg shadow-gold-primary/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F4C542" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6h2l3 5v5h-2"/>
              <path d="M5.5 17.5L9 9h5l2.5 5"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Bienvenido a <span className="text-white">Riber</span><span className="text-gold-primary">GO</span></h2>
          <p className="text-[11px] text-text-secondary mt-0.5">Ingresa tu celular para iniciar sesión</p>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PHONE INPUT */}
        {smsStep === 'ENTER_PHONE' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1 ml-1">
                Número de Celular (Bolivia)
              </label>

              {/* Display field (readOnly - uses virtual keypad below) */}
              <div className="relative flex items-center bg-surface border border-gold-primary/50 rounded-2xl overflow-hidden shadow-inner">
                <div className="px-3.5 py-3 bg-surface-2 border-r border-border-custom flex items-center gap-1.5 text-gold-primary font-bold text-sm select-none">
                  <Smartphone className="w-4 h-4 text-gold-primary" />
                  <span>+591</span>
                </div>
                <div className="w-full py-3 px-4 text-lg font-bold font-mono tracking-widest text-white">
                  {phoneDigits ? (
                    <span className="text-white">{phoneDigits}</span>
                  ) : (
                    <span className="text-text-secondary/30 font-normal text-base">76868110</span>
                  )}
                </div>
              </div>
            </div>

            {/* Custom On-Screen Animated Keypad for Phone */}
            <CustomNumericKeypad
              currentLength={phoneDigits.length}
              maxLength={8}
              onKeyPress={(d) => setPhoneDigits((prev) => (prev + d).slice(0, 8))}
              onDelete={() => setPhoneDigits((prev) => prev.slice(0, -1))}
              onSubmit={handlePhoneSubmit}
              isSubmitDisabled={phoneDigits.length < 7 || isLoading}
            />
          </div>
        ) : (
          /* STEP 2: VERIFY 6-DIGIT CODE */
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-gold-primary/10 border border-gold-primary/20 text-center">
              <p className="text-xs text-gold-primary font-medium">
                Código SMS enviado a <span className="font-bold">+591 {phoneDigits}</span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1 ml-1 text-center">
                Código de Confirmación (6 dígitos)
              </label>
              
              {/* Didactic OTP PIN Slot Box Component */}
              <OtpPinInput value={smsCode} length={6} />
            </div>

            {/* Custom On-Screen Keypad for OTP PIN */}
            <CustomNumericKeypad
              currentLength={smsCode.length}
              maxLength={6}
              onKeyPress={(d) => setSmsCode((prev) => (prev + d).slice(0, 6))}
              onDelete={() => setSmsCode((prev) => prev.slice(0, -1))}
              onSubmit={handleVerifyCode}
              isSubmitDisabled={smsCode.length < 6 || isLoading}
            />

            <button
              type="button"
              onClick={() => setSmsStep('ENTER_PHONE')}
              className="w-full text-xs text-text-secondary hover:text-white text-center underline pt-1"
            >
              Cambiar número de celular
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-custom" /></div>
          <span className="relative bg-background px-3 text-[11px] text-text-secondary uppercase">o inicia sesión rápido</span>
        </div>

        {/* Google 1-Tap Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          className="w-full py-3 px-4 bg-white text-slate-900 font-semibold rounded-xl flex items-center justify-center gap-2.5 shadow-md hover:bg-slate-100 transition active:scale-[0.98] disabled:opacity-50 text-xs"
        >
          {isGoogleLoading ? (
            <IosSpinner size="sm" color="dark" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Register Link */}
      <div className="pb-safe pt-2 text-center">
        <p className="text-[11px] text-text-secondary">
          ¿No tienes una cuenta?{' '}
          <button
            onClick={() => {
              haptics.selection();
              setCurrentView('REGISTER');
            }}
            className="text-gold-primary font-bold hover:underline"
          >
            Regístrate gratis
          </button>
        </p>
      </div>

      {/* UNREGISTERED USER CUPERTINO MODAL */}
      {showUnregisteredModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-surface border border-gold-primary/40 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">¡Hola, bienvenido a RiberGO!</h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                El número <span className="text-gold-primary font-bold">+591 {phoneDigits}</span> aún no está registrado.
                Regístrate en solo 5 segundos para pedir tu mototaxi. 🛵✨
              </p>
            </div>

            <button
              onClick={handleGoToRegister}
              className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarme ahora</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
