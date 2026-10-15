'use client';

import { useState, useEffect } from 'react';
import { useAppStore, UserProfile } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { ArrowLeft, Phone, User as UserIcon, AlertCircle } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { ConfirmationResult } from 'firebase/auth';
import { CustomNumericKeypad } from '@/components/shared/CustomNumericKeypad';
import { OtpPinInput } from '@/components/shared/OtpPinInput';
import { IosToastOverlay } from '@/components/shared/IosToastOverlay';
import { IosSpinner } from '@/components/shared/IosSpinner';

export const RegisterView = () => {
  const { setCurrentView, loginUser, setRole, pendingRegisterPhone } = useAppStore();

  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState(pendingRegisterPhone || '');
  const [smsCode, setSmsCode] = useState('');
  const [smsStep, setSmsStep] = useState<'FILL_DETAILS' | 'ENTER_CODE'>('FILL_DETAILS');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // iOS Toast Overlay States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Cargando...');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('¡Cuenta Creada!');
  const [successSubtitle, setSuccessSubtitle] = useState('Bienvenido a RiberGO');
  const [pendingUserProfile, setPendingUserProfile] = useState<UserProfile | null>(null);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize reCAPTCHA on load
  useEffect(() => {
    if (smsStep === 'FILL_DETAILS') {
      const timer = setTimeout(() => {
        apiService.setupRecaptcha('recaptcha-container-register');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [smsStep]);

  // Step 1: Submit Name + Phone -> Send SMS verification code
  const handleRegisterSubmit = async () => {
    haptics.heavy();
    setIsLoading(true);
    setLoadingText('Enviando código SMS de confirmación...');
    setErrorMsg(null);

    const fullPhone = `+591${phoneDigits.trim().replace(/[^0-9]/g, '')}`;

    if (!name.trim()) {
      setErrorMsg('Por favor ingresa tu Nombre Completo.');
      setIsLoading(false);
      return;
    }

    if (phoneDigits.trim().length < 7) {
      setErrorMsg('Por favor ingresa un número de celular válido de Bolivia (ej. 76868110)');
      setIsLoading(false);
      return;
    }

    try {
      const verifier = (window as any).recaptchaVerifier || apiService.setupRecaptcha('recaptcha-container-register');
      const result = await apiService.sendSmsVerification(fullPhone, verifier);

      setConfirmationResult(result);
      setSmsStep('ENTER_CODE');
    } catch (err: any) {
      console.error('Registration SMS error:', err);
      if (err?.code === 'auth/invalid-phone-number') {
        setErrorMsg('El número de celular no es válido.');
      } else if (
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('SMS unable to be sent until this region enabled')
      ) {
        setErrorMsg('Servicio SMS de Bolivia (+591) pendiente de habilitar en Firebase Console o usa un Número de Prueba.');
      } else {
        setErrorMsg('Error al enviar código SMS: ' + (err?.message || 'Error de conexión'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm Code & Save Profile in Firestore
  const handleVerifyRegisterCode = async () => {
    haptics.heavy();
    setIsLoading(true);
    setLoadingText('Creando tu cuenta en Cloud Firestore...');
    setErrorMsg(null);

    if (smsCode.length < 6) {
      setErrorMsg('Por favor ingresa el código de 6 dígitos completo.');
      setIsLoading(false);
      return;
    }

    if (!confirmationResult) {
      setErrorMsg('Sesión de registro vencida. Intenta nuevamente.');
      setIsLoading(false);
      return;
    }

    try {
      const userProfile = await apiService.confirmSmsCode(confirmationResult, smsCode, {
        name: name.trim() || 'Pasajero RiberGO',
        role: 'PASSENGER',
      });

      setPendingUserProfile(userProfile);
      setIsLoading(false);

      // Trigger iOS Success HUD with sound & haptic
      setSuccessTitle('¡Cuenta Creada!');
      setSuccessSubtitle(`¡Bienvenido a RiberGO, ${userProfile.name}!`);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Registration verification failed:', err);
      setIsLoading(false);
      if (err?.code === 'auth/invalid-verification-code') {
        setErrorMsg('El código de 6 dígitos es incorrecto.');
      } else {
        setErrorMsg('Error al verificar registro: ' + (err?.message || 'Código inválido'));
      }
    }
  };

  // Google Fast Register
  const handleGoogleRegister = async () => {
    haptics.heavy();
    setIsGoogleLoading(true);
    setIsLoading(true);
    setLoadingText('Registrando cuenta con Google...');
    setErrorMsg(null);

    try {
      const userProfile = await apiService.loginWithGoogle();
      setPendingUserProfile(userProfile);
      setIsLoading(false);
      setIsGoogleLoading(false);

      // Trigger iOS Success HUD
      setSuccessTitle('¡Registro Exitoso!');
      setSuccessSubtitle(`Cuenta creada como ${userProfile.name}`);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setIsLoading(false);
      setIsGoogleLoading(false);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Registro con Google cancelado.');
      } else {
        setErrorMsg('Error con Google Sign-In: ' + (err?.message || 'No se pudo conectar'));
      }
    }
  };

  // Called after iOS Success HUD animation finishes (1.4s)
  const handleSuccessFinished = () => {
    if (pendingUserProfile) {
      loginUser(pendingUserProfile, 'ROLE_SELECTION');
      setCurrentView('ROLE_SELECTION');
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 text-white relative">
      {/* Invisible Recaptcha container */}
      <div id="recaptcha-container-register"></div>

      {/* iOS Loading & Success Toast Overlay */}
      <IosToastOverlay
        isLoading={isLoading}
        loadingText={loadingText}
        showSuccess={showSuccess}
        successTitle={successTitle}
        successSubtitle={successSubtitle}
        onSuccessComplete={handleSuccessFinished}
      />

      <div className="pt-safe max-w-sm mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Top Back Header */}
        <div className="flex items-center mb-3">
          <button 
            onClick={() => {
              haptics.selection();
              setCurrentView('LOGIN');
            }}
            className="p-2 rounded-xl bg-surface border border-border-custom text-text-secondary hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="ml-2.5 text-[11px] font-semibold text-text-secondary uppercase">Crear Cuenta</span>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gold-primary/25 blur-md" />
            <img
              src="/logo.png"
              alt="RiberGO Logo"
              className="w-12 h-12 object-contain rounded-2xl shadow-lg relative z-10 border border-gold-primary/30"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Únete a <span className="text-white">Riber</span><span className="text-gold-primary">GO</span></h2>
            <p className="text-[11px] text-text-secondary mt-0.5">Ingresa tu nombre y celular para registrarte</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {smsStep === 'FILL_DETAILS' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1 ml-1">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-surface border border-border-custom rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-text-secondary/50 focus:outline-none focus:border-gold-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1 ml-1">
                Número de Celular (Obligatorio)
              </label>
              <div className="relative flex items-center bg-surface border border-gold-primary/50 rounded-2xl overflow-hidden shadow-inner">
                <div className="px-3.5 py-3 bg-surface-2 border-r border-border-custom flex items-center gap-1.5 text-gold-primary font-bold text-sm select-none">
                  <Phone className="w-4 h-4 text-gold-primary" />
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
              onSubmit={handleRegisterSubmit}
              isSubmitDisabled={!name.trim() || phoneDigits.length < 7 || isLoading}
            />
          </div>
        ) : (
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
              onSubmit={handleVerifyRegisterCode}
              isSubmitDisabled={smsCode.length < 6 || isLoading}
            />
          </div>
        )}

        {/* Divider */}
        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-custom" /></div>
          <span className="relative bg-background px-3 text-[11px] text-text-secondary uppercase">o regístrate con</span>
        </div>

        {/* Google Fast Register */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={isGoogleLoading || isLoading}
          className="w-full py-2.5 px-4 bg-white text-slate-900 font-semibold rounded-xl flex items-center justify-center gap-2.5 shadow-md hover:bg-slate-100 transition active:scale-[0.98] disabled:opacity-50 text-xs"
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
              <span>Registro rápido con Google</span>
            </>
          )}
        </button>
      </div>

      <div className="pb-safe pt-2 text-center">
        <p className="text-[11px] text-text-secondary">
          ¿Ya tienes cuenta?{' '}
          <button
            onClick={() => {
              haptics.selection();
              setCurrentView('LOGIN');
            }}
            className="text-gold-primary font-bold hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
};
