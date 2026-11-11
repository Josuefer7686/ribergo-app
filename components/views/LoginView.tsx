'use client';

import { useState } from 'react';
import { useAppStore, UserProfile } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { Smartphone, Sparkles, Check, AlertCircle, ArrowRight, ShieldCheck, Zap, Bike } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { IosToastOverlay } from '@/components/shared/IosToastOverlay';
import { IosSpinner } from '@/components/shared/IosSpinner';
import { motion, AnimatePresence } from 'motion/react';
import { APP_VERSION } from '@/lib/appVersion';

export const LoginView = () => {
  const { setCurrentView, loginUser, resetNotice, dismissResetNotice } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Iniciando sesión...');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('¡Bienvenido!');
  const [successSubtitle, setSuccessSubtitle] = useState('Sesión iniciada con éxito');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal para pedir el número de celular en el primer registro
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Iniciar sesión con Google (Fácil, rápido, 1 toque)
  const handleGoogleLogin = async () => {
    haptics.heavy();
    setIsLoading(true);
    setLoadingText('Autenticando con Google...');
    setErrorMsg(null);

    try {
      const { profile, isFirstTime } = await apiService.loginWithGoogle();
      setPendingUser(profile);
      setIsFirstTimeUser(isFirstTime);
      setIsLoading(false);

      if (isFirstTime) {
        // Primer registro: verificar si le falta ingresar su teléfono
        const cleanPhone = (profile.phone || '').replace(/[^0-9]/g, '');
        if (!profile.phone || cleanPhone.length < 8 || cleanPhone === '59170000000') {
          setShowPhoneModal(true);
        } else {
          // Ya tiene teléfono, falta seleccionar rol
          setSuccessTitle('¡Bienvenido!');
          setSuccessSubtitle(`${profile.name}`);
          setShowSuccess(true);
        }
      } else {
        // Usuario recurrente con teléfono y rol ya registrados
        setSuccessTitle('¡Bienvenido de nuevo!');
        setSuccessSubtitle(`${profile.name}`);
        setShowSuccess(true);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setIsLoading(false);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Inicio de sesión cancelado.');
      } else {
        setErrorMsg('No se pudo conectar con Google. Por favor intenta de nuevo.');
      }
    }
  };

  // Guardar número de celular en el primer registro
  const handleSavePhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = phoneDigits.trim().replace(/[^0-9]/g, '');

    if (clean.length < 8) {
      setPhoneError('Por favor ingresa un número de celular válido de 8 dígitos (ej. 76868110)');
      haptics.error();
      return;
    }

    if (!pendingUser) return;

    haptics.heavy();
    setSavingPhone(true);
    setPhoneError(null);

    try {
      const fullPhone = await apiService.updateUserPhone(pendingUser.id, clean);
      const updatedProfile: UserProfile = {
        ...pendingUser,
        phone: fullPhone,
        hasSelectedRole: false,
      };

      setPendingUser(updatedProfile);
      setSavingPhone(false);
      setShowPhoneModal(false);

      // Feedback animado iOS
      setSuccessTitle('¡Cuenta Lista!');
      setSuccessSubtitle(`Bienvenido a RiberGO, ${updatedProfile.name}`);
      setShowSuccess(true);
    } catch (err) {
      console.error('Error guardando celular:', err);
      setSavingPhone(false);
      setPhoneError('Hubo un error al guardar el teléfono. Intenta nuevamente.');
    }
  };

  // Fin de la animación HUD de éxito
  const handleSuccessFinished = () => {
    if (pendingUser) {
      const cleanPhone = (pendingUser.phone || '').replace(/[^0-9]/g, '');
      const hasPhone = cleanPhone.length >= 8 && cleanPhone !== '59170000000';
      // Solo va a selección de rol si es usuario nuevo y no ha elegido rol permanentemente
      const needsRoleSelection = isFirstTimeUser || !pendingUser.hasSelectedRole || !hasPhone;

      if (!needsRoleSelection) {
        // Usuario existente: VA DIRECTO A MAIN_APP sin volver a preguntar rol
        loginUser(pendingUser, 'MAIN_APP');
        setCurrentView('MAIN_APP');
      } else {
        // Primer registro: va a la pantalla de selección de rol única y permanente
        loginUser(pendingUser, 'ROLE_SELECTION');
        setCurrentView('ROLE_SELECTION');
      }
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 text-white relative overflow-hidden select-none">
      {/* Luces doradas de fondo estéticas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-gold-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* iOS Loading & Success Toast Overlay */}
      <IosToastOverlay
        isLoading={isLoading}
        loadingText={loadingText}
        showSuccess={showSuccess}
        successTitle={successTitle}
        successSubtitle={successSubtitle}
        onSuccessComplete={handleSuccessFinished}
      />

      <div className="pt-safe flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10 space-y-6">
        {/* Header Branding con Logo Oficial RiberGO */}
        <div className="text-center space-y-2">
          <div className="relative inline-flex items-center justify-center mb-1">
            <div className="absolute inset-0 rounded-[2rem] bg-gold-primary/30 blur-xl animate-pulse" />
            <img
              src="/logo.png"
              alt="RiberGO Logo"
              className="w-24 h-24 object-contain rounded-[2rem] shadow-2xl shadow-gold-primary/20 relative z-10 border border-gold-primary/40"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bienvenido a <span className="text-white">Riber</span><span className="text-gold-primary">GO</span>
          </h1>
          <p className="text-xs text-text-secondary max-w-[280px] mx-auto leading-relaxed">
            Tu transporte más rápido, seguro y confiable en Riberalta, Beni.
          </p>
        </div>

        {resetNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="p-4 rounded-2xl bg-gold-primary/10 border border-gold-primary/40 text-sm text-white space-y-2"
          >
            <p className="font-extrabold text-gold-primary">RiberGO se reinició: versión {APP_VERSION}</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Hicimos un reinicio general de la aplicación por temas de seguridad y cambios en nuestras normas, así que tu sesión se cerró. Ahora sí puedes registrarte de nuevo. ¡Gracias por tu paciencia!
            </p>
            <button type="button" onClick={dismissResetNotice} className="min-h-10 px-4 rounded-xl bg-gold-primary text-background text-xs font-black">Entendido</button>
          </motion.div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tarjetas de Beneficios */}
        <div className="grid grid-cols-1 gap-2.5">
          <div className="p-3 rounded-2xl bg-surface/70 border border-border-custom flex items-center gap-3 backdrop-blur-md">
            <div className="w-9 h-9 rounded-xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary shrink-0 shadow-inner">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Ingreso Rápido en 1 Toque</p>
              <p className="text-[10px] text-text-secondary">Sin contraseñas complicadas ni esperas de SMS.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface/70 border border-border-custom flex items-center gap-3 backdrop-blur-md">
            <div className="w-9 h-9 rounded-xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary shrink-0 shadow-inner">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Mototaxis & Auxilio en Tiempo Real</p>
              <p className="text-[10px] text-text-secondary">Conecta con choferes verificados cerca de ti.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface/70 border border-border-custom flex items-center gap-3 backdrop-blur-md">
            <div className="w-9 h-9 rounded-xl bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary shrink-0 shadow-inner">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Tarifa Justa & Negociable</p>
              <p className="text-[10px] text-text-secondary">Acuerda tu pasaje en el chat de regateo.</p>
            </div>
          </div>
        </div>

        {/* BOTÓN PRINCIPAL: CONTINUAR CON GOOGLE */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 px-5 bg-white hover:bg-neutral-100 text-slate-900 font-extrabold rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-white/10 transition active:scale-[0.98] disabled:opacity-50 text-sm group"
          >
            {/* Logo Oficial de Google SVG a 4 colores */}
            <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continuar con Google</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-[10px] text-center text-text-secondary">
            Al continuar, aceptas los Términos de Servicio de RiberGO Bolivia.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-safe pt-2 text-center z-10">
        <p className="text-[11px] text-text-secondary/70">
          RiberGO • Riberalta, Beni, Bolivia 🇧🇴
        </p>
      </div>

      {/* MODAL CUPERTINO PARA PEDIR EL CELULAR EN EL PRIMER REGISTRO */}
      <AnimatePresence>
        {showPhoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-surface border border-gold-primary/50 rounded-3xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-gold-primary/20 border-2 border-gold-primary/60 flex items-center justify-center text-gold-primary mx-auto shadow-lg shadow-gold-primary/20">
                <Smartphone className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">¡Casi listo, {pendingUser?.name?.split(' ')[0]}!</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Para coordinar tus viajes y que los mototaxistas puedan llamarte o ubicarte en Riberalta, ingresa tu número de celular:
                </p>
              </div>

              {phoneError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {phoneError}
                </div>
              )}

              <form onSubmit={handleSavePhone} className="space-y-4">
                <div className="relative flex items-center bg-surface-2 border border-gold-primary/50 rounded-2xl overflow-hidden shadow-inner focus-within:border-gold-primary transition">
                  <div className="px-3.5 py-3.5 bg-surface border-r border-border-custom flex items-center gap-1.5 text-gold-primary font-bold text-sm select-none">
                    <span>🇧🇴</span>
                    <span>+591</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    autoFocus
                    value={phoneDigits}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                      setPhoneDigits(val);
                      if (phoneError) setPhoneError(null);
                    }}
                    placeholder="76868110"
                    className="w-full py-3 px-4 text-lg font-black font-mono tracking-widest text-white placeholder-text-secondary/40 bg-transparent focus:outline-none"
                    style={{ fontSize: '18px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPhone || phoneDigits.length < 8}
                  className="w-full py-3.5 bg-gradient-to-r from-gold-primary via-amber-400 to-yellow-500 text-background rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-[0.98] disabled:opacity-40"
                >
                  {savingPhone ? (
                    <IosSpinner size="sm" color="dark" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Guardar y Continuar</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
