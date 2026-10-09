'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { IosModal } from '@/components/shared/IosModal';
import { 
  User, Bike, CreditCard, Bell, Shield, Settings, HelpCircle, LogOut, ChevronRight, Star, 
  Check, Smartphone, Lock, AlertTriangle, ExternalLink, QrCode, DollarSign, MessageCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';
import { notifications } from '@/utils/notifications';

export const ProfileView = () => {
  const { user, role, logout, preferences, setPaymentMethod, toggleNotification, toggleSetting, setShowPwaModal } = useAppStore();
  const [notifPermission, setNotifPermission] = useState<string>(() => notifications.getPermission());
  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isNavStandalone = (navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    return isStandaloneMedia || isNavStandalone || isAndroidApp;
  });

  const isPassenger = role === 'PASSENGER';

  // Sync Dark/Light theme with document body
  useEffect(() => {
    if (!preferences.settings.darkMode) {
      document.body.classList.add('theme-light');
      document.documentElement.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
      document.documentElement.classList.remove('theme-light');
    }
  }, [preferences.settings.darkMode]);

  // Modal Visibility States
  const [activeModal, setActiveModal] = useState<
    'PAYMENTS' | 'NOTIFICATIONS' | 'SECURITY' | 'SETTINGS' | 'SUPPORT' | 'DRIVER_REGISTRATION' | null
  >(null);

  const [cardInput, setCardInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="w-full h-full bg-background p-4 sm:p-6 text-white overflow-y-auto no-scrollbar">
      <div className="pt-safe max-w-sm mx-auto space-y-5">
        
        {/* User Profile Card */}
        <div className="p-5 rounded-3xl bg-surface border border-border-custom shadow-xl relative overflow-hidden flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border-2 border-gold-primary/40 flex items-center justify-center text-gold-primary font-black text-2xl shadow-lg">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="w-4 h-4 rounded-full bg-gold-primary border-2 border-background absolute bottom-0 right-0" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">{user?.name || 'Usuario RiberGO'}</h3>
              <span className="px-2 py-0.5 rounded-full bg-gold-primary/20 text-[9px] font-black text-gold-primary uppercase border border-gold-primary/30">
                {isPassenger ? 'Pasajero' : 'Conductor'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{user?.phone || '+591 70000000'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-gold-primary text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-gold-primary" />
                <span>{user?.trips && user.trips > 0 ? user.rating : (user?.rating || 'Nuevo')}</span>
              </span>
              <span className="text-[10px] text-text-secondary">• {user?.trips || 0} viajes</span>
            </div>
          </div>
        </div>

        {/* DRIVER REGISTRATION / SECURITY INFO BANNER */}
        <div className="p-4 rounded-2xl bg-surface-2 border border-gold-primary/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">¿Quieres ser Conductor en Riberalta?</p>
              <p className="text-[10px] text-text-secondary">Inscripción y verificación de mototaxi</p>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.impact();
              setActiveModal('DRIVER_REGISTRATION');
            }}
            className="px-3 py-2 rounded-xl bg-gold-primary text-background font-black text-xs hover:bg-gold-light transition shadow-md shadow-gold-primary/20 active:scale-95 whitespace-nowrap"
          >
            Requisitos
          </button>
        </div>

        {/* PUSH NOTIFICATIONS PERMISSION BANNER */}
        {notifPermission !== 'granted' && (
          <div className="p-4 rounded-2xl bg-gold-primary/10 border border-gold-primary/40 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-primary/20 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Activar Notificaciones Push</p>
                <p className="text-[10px] text-gold-light">Alertas con sonido y vibración iOS</p>
              </div>
            </div>

            <button
              onClick={async () => {
                haptics.impact();
                const granted = await notifications.requestPermission();
                if (granted) {
                  setNotifPermission('granted');
                  audio.messageReceived();
                  haptics.success();
                }
              }}
              className="px-3 py-2 rounded-xl bg-gold-primary text-background font-black text-xs hover:bg-gold-light transition shadow-md shadow-gold-primary/20 active:scale-95 whitespace-nowrap"
            >
              Activar
            </button>
          </div>
        )}

        {/* DYNAMIC PWA APP INSTALLATION STATUS CARD */}
        <div className="p-4 rounded-3xl bg-surface border border-gold-primary/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Estado de la Aplicación</h4>
                <p className="text-[10px] text-text-secondary">
                  {isStandalone ? 'Ejecutándose como App Nativa' : 'Ejecutándose en Navegador Web'}
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
              isStandalone
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-gold-primary/20 text-gold-primary border border-gold-primary/40'
            }`}>
              {isStandalone ? (
                <>
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Instalado</span>
                </>
              ) : (
                <span>Navegador Web</span>
              )}
            </span>
          </div>

          {!isStandalone && (
            <div className="pt-2 border-t border-border-custom flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  haptics.heavy();
                  setShowPwaModal(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gold-primary text-background font-black text-xs hover:bg-gold-light transition shadow-md shadow-gold-primary/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-4 h-4" />
                <span>Instalar RiberGO App</span>
              </button>

              <button
                onClick={() => {
                  haptics.selection();
                  localStorage.removeItem('ribergo_hide_install_prompt');
                  setShowPwaModal(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-surface-2 text-text-secondary hover:text-white font-bold text-[11px] transition active:scale-95 whitespace-nowrap"
                title="Restablecer avisos de instalación"
              >
                Restablecer Avisos
              </button>
            </div>
          )}
        </div>

        {/* Functional Menu Items */}
        <div className="p-2 rounded-3xl bg-surface border border-border-custom space-y-1">
          <button 
            onClick={() => {
              haptics.selection();
              setActiveModal('PAYMENTS');
            }}
            className="w-full p-3.5 rounded-2xl hover:bg-surface-2 flex items-center justify-between text-xs group transition"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-gold-primary" />
              <span className="font-semibold text-white">Métodos de Pago</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gold-primary uppercase">
                {preferences.paymentMethod === 'CASH' ? 'Efectivo BOB' : preferences.paymentMethod === 'QR' ? 'QR Bolivia' : 'Tarjeta'}
              </span>
              <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
            </div>
          </button>

          <button 
            onClick={() => {
              haptics.selection();
              setActiveModal('NOTIFICATIONS');
            }}
            className="w-full p-3.5 rounded-2xl hover:bg-surface-2 flex items-center justify-between text-xs group transition"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-gold-primary" />
              <span className="font-semibold text-white">Notificaciones</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
          </button>

          <button 
            onClick={() => {
              haptics.selection();
              setActiveModal('SECURITY');
            }}
            className="w-full p-3.5 rounded-2xl hover:bg-surface-2 flex items-center justify-between text-xs group transition"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-gold-primary" />
              <span className="font-semibold text-white">Seguridad y Privacidad</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
          </button>

          <button 
            onClick={() => {
              haptics.selection();
              setActiveModal('SETTINGS');
            }}
            className="w-full p-3.5 rounded-2xl hover:bg-surface-2 flex items-center justify-between text-xs group transition"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-gold-primary" />
              <span className="font-semibold text-white">Configuración</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
          </button>

          <button 
            onClick={() => {
              haptics.selection();
              setActiveModal('SUPPORT');
            }}
            className="w-full p-3.5 rounded-2xl hover:bg-surface-2 flex items-center justify-between text-xs group transition"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-gold-primary" />
              <span className="font-semibold text-white">Ayuda y Soporte</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold-primary transition" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            haptics.impact();
            logout();
          }}
          className="w-full py-3.5 bg-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>

        <div className="text-center text-[10px] text-text-secondary pb-4">
          <span>RiberGO PWA v2.0 • Riberalta, Bolivia</span>
        </div>
      </div>

      {/* MODAL 1: MÉTODOS DE PAGO */}
      <IosModal
        isOpen={activeModal === 'PAYMENTS'}
        onClose={() => setActiveModal(null)}
        title="Métodos de Pago"
      >
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">Selecciona tu método de pago principal para los viajes en Riberalta.</p>
          
          {/* CASH (Default) */}
          <button
            onClick={() => {
              haptics.selection();
              setPaymentMethod('CASH');
            }}
            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition ${
              preferences.paymentMethod === 'CASH'
                ? 'bg-gold-primary/10 border-gold-primary text-gold-primary'
                : 'bg-surface-2 border-border-custom text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-primary/20 flex items-center justify-center text-gold-primary">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold">Efectivo en Bolivianos (BOB)</p>
                <p className="text-[10px] text-text-secondary">Paga directamente al mototaxista al finalizar</p>
              </div>
            </div>
            {preferences.paymentMethod === 'CASH' && <Check className="w-5 h-5 text-gold-primary" />}
          </button>

          {/* QR COBRO BOLIVIA */}
          <button
            onClick={() => {
              haptics.selection();
              setPaymentMethod('QR');
            }}
            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition ${
              preferences.paymentMethod === 'QR'
                ? 'bg-gold-primary/10 border-gold-primary text-gold-primary'
                : 'bg-surface-2 border-border-custom text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-gold-primary border border-border-custom">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold">Pago por QR (Bancos de Bolivia)</p>
                <p className="text-[10px] text-text-secondary">Escanea el QR del conductor desde tu banca móvil</p>
              </div>
            </div>
            {preferences.paymentMethod === 'QR' && <Check className="w-5 h-5 text-gold-primary" />}
          </button>

          {/* CARD */}
          <button
            onClick={() => {
              haptics.selection();
              setPaymentMethod('CARD');
            }}
            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition ${
              preferences.paymentMethod === 'CARD'
                ? 'bg-gold-primary/10 border-gold-primary text-gold-primary'
                : 'bg-surface-2 border-border-custom text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-gold-primary border border-border-custom">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold">Tarjeta de Débito / Crédito</p>
                <p className="text-[10px] text-text-secondary">Visa / Mastercard habilitadas para pagos por internet</p>
              </div>
            </div>
            {preferences.paymentMethod === 'CARD' && <Check className="w-5 h-5 text-gold-primary" />}
          </button>
        </div>
      </IosModal>

      {/* MODAL 2: NOTIFICACIONES */}
      <IosModal
        isOpen={activeModal === 'NOTIFICATIONS'}
        onClose={() => setActiveModal(null)}
        title="Configuración de Notificaciones"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Estado de Viaje & Llegada</p>
              <p className="text-[10px] text-text-secondary">Avisos de mototaxis cerca y llegada al origen</p>
            </div>
            <button
              onClick={() => {
                haptics.selection();
                toggleNotification('rideUpdates');
              }}
              className={`w-12 h-6 rounded-full transition-colors p-1 ${preferences.notifications.rideUpdates ? 'bg-gold-primary' : 'bg-surface'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-background transition-transform ${preferences.notifications.rideUpdates ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Promociones & Cupones</p>
              <p className="text-[10px] text-text-secondary">Descuentos especiales de viajes en Riberalta</p>
            </div>
            <button
              onClick={() => {
                haptics.selection();
                toggleNotification('promotions');
              }}
              className={`w-12 h-6 rounded-full transition-colors p-1 ${preferences.notifications.promotions ? 'bg-gold-primary' : 'bg-surface'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-background transition-transform ${preferences.notifications.promotions ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Alertas de Seguridad</p>
              <p className="text-[10px] text-text-secondary">Notificaciones de cuenta y seguridad en viajes</p>
            </div>
            <button
              onClick={() => {
                haptics.selection();
                toggleNotification('securityAlerts');
              }}
              className={`w-12 h-6 rounded-full transition-colors p-1 ${preferences.notifications.securityAlerts ? 'bg-gold-primary' : 'bg-surface'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-background transition-transform ${preferences.notifications.securityAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Sonidos de la App</p>
              <p className="text-[10px] text-text-secondary">Alertas sonoras al encontrar mototaxi</p>
            </div>
            <button
              onClick={() => {
                haptics.selection();
                toggleNotification('sounds');
              }}
              className={`w-12 h-6 rounded-full transition-colors p-1 ${preferences.notifications.sounds ? 'bg-gold-primary' : 'bg-surface'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-background transition-transform ${preferences.notifications.sounds ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </IosModal>

      {/* MODAL 3: SEGURIDAD Y PRIVACIDAD */}
      <IosModal
        isOpen={activeModal === 'SECURITY'}
        onClose={() => setActiveModal(null)}
        title="Seguridad y Privacidad"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom space-y-2">
            <div className="flex items-center gap-2 text-gold-primary font-bold">
              <Shield className="w-4 h-4" />
              <span>Privacidad de Ubicación</span>
            </div>
            <p className="text-[11px] text-text-secondary">Tu ubicación GPS sólo es visible para el mototaxista asignado durante el tiempo que dure el viaje.</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom space-y-2">
            <div className="flex items-center gap-2 text-gold-primary font-bold">
              <Lock className="w-4 h-4" />
              <span>Seguridad de la Cuenta</span>
            </div>
            <p className="text-[11px] text-text-secondary">Por políticas de seguridad, las cuentas de Pasajero y Conductor son independientes y verificadas individualmente.</p>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-xl text-xs hover:bg-red-500/20 transition"
            >
              Eliminar mi cuenta RiberGO
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 space-y-3">
              <p className="text-xs text-red-400 font-bold">¿Estás seguro de eliminar tu cuenta?</p>
              <p className="text-[10px] text-text-secondary">Esta acción borrará tu historial de viajes y preferencias de Riberalta.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-surface text-white font-semibold">Cancelar</button>
                <button onClick={logout} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold">Confirmar</button>
              </div>
            </div>
          )}
        </div>
      </IosModal>

      {/* MODAL 4: CONFIGURACIÓN */}
      <IosModal
        isOpen={activeModal === 'SETTINGS'}
        onClose={() => setActiveModal(null)}
        title="Configuración de la App"
      >
        <div className="space-y-4 text-xs">
          {/* DISTANCE UNITS TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Unidades de Distancia</p>
              <p className="text-[10px] text-text-secondary">Cálculo de recorridos ({preferences.settings.units === 'km' ? 'Kilómetros' : 'Millas'})</p>
            </div>
            <button
              onClick={() => {
                haptics.selection();
                toggleSetting('units');
              }}
              className="px-3 py-1.5 rounded-xl bg-gold-primary text-background font-black text-xs uppercase hover:bg-gold-light transition active:scale-95 shadow-md shadow-gold-primary/20"
            >
              {preferences.settings.units === 'km' ? 'Kilómetros (Km)' : 'Millas (Mi)'}
            </button>
          </div>

          {/* THEME TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Tema Visual</p>
              <p className="text-[10px] text-text-secondary">Apariencia de la interfaz</p>
            </div>
            <button
              onClick={() => {
                haptics.selection();
                toggleSetting('darkMode');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition active:scale-95 ${
                preferences.settings.darkMode 
                  ? 'bg-surface text-gold-primary border-gold-primary/40' 
                  : 'bg-gold-primary text-background border-gold-primary font-black'
              }`}
            >
              {preferences.settings.darkMode ? 'Oscuro Lujo' : 'Modo Claro'}
            </button>
          </div>

          {/* HAPTIC FEEDBACK TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2 border border-border-custom">
            <div>
              <p className="font-bold text-white">Vibración Táctil (Haptics)</p>
              <p className="text-[10px] text-text-secondary">Feedback táctil al presionar botones</p>
            </div>
            <button
              onClick={() => {
                toggleSetting('hapticFeedback');
                haptics.selection();
              }}
              className={`w-12 h-6 rounded-full transition-colors p-1 ${preferences.settings.hapticFeedback ? 'bg-gold-primary' : 'bg-surface'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-background transition-transform ${preferences.settings.hapticFeedback ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </IosModal>

      {/* MODAL 5: AYUDA Y SOPORTE */}
      <IosModal
        isOpen={activeModal === 'SUPPORT'}
        onClose={() => setActiveModal(null)}
        title="Ayuda y Soporte técnico"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-surface-2 border border-border-custom space-y-2">
            <h4 className="font-bold text-gold-primary">Preguntas Frecuentes en Riberalta</h4>
            <div className="space-y-2 text-[11px] text-text-secondary pt-1">
              <p><strong className="text-white">¿Cómo se calculan las tarifas?</strong> Se calculan en Bolivianos (BOB) según la distancia aproximada entre el origen y destino.</p>
              <p><strong className="text-white">¿Puedo pedir sin fijar destino?</strong> Sí, elige la opción &quot;Acordar destino en persona&quot; y acuerdas con el conductor al subirte.</p>
              <p><strong className="text-white">¿Qué pasa si olvidé un objeto?</strong> Escríbenos a soporte indicando la fecha de tu viaje para contactar al mototaxista.</p>
            </div>
          </div>

          <a
            href="https://wa.me/59176543210"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Contactar Soporte por WhatsApp</span>
          </a>
        </div>
      </IosModal>

      {/* MODAL 6: REQUISITOS REGISTRO CONDUCTOR */}
      <IosModal
        isOpen={activeModal === 'DRIVER_REGISTRATION'}
        onClose={() => setActiveModal(null)}
        title="Inscripción de Conductor Mototaxi"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-gold-primary/10 border border-gold-primary/40 space-y-2">
            <div className="flex items-center gap-2 text-gold-primary font-bold">
              <Bike className="w-5 h-5" />
              <span>Conduce con RiberGO en Riberalta</span>
            </div>
            <p className="text-[11px] text-text-secondary">Genera ingresos en tu propio horario prestando servicio de mototaxi seguro.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">Requisitos Obligatorios:</h4>
            <div className="p-3.5 rounded-2xl bg-surface-2 border border-border-custom space-y-1.5 text-[11px]">
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-primary" /> Licencia de conducir vigente</p>
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-primary" /> Motocicleta en buen estado (Placa RBT-xxx)</p>
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-primary" /> Documento de identidad boliviano</p>
              <p className="flex items-center gap-2"><Check className="w-4 h-4 text-gold-primary" /> Casco de seguridad para pasajero</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-custom text-center space-y-2">
            <p className="text-[11px] text-text-secondary">Por seguridad, para conducir debes iniciar sesión con tu cuenta de Conductor verificada.</p>
            <button
              onClick={() => {
                setActiveModal(null);
                logout();
              }}
              className="w-full py-3 bg-gold-primary text-background font-black rounded-xl text-xs uppercase shadow-md shadow-gold-primary/20"
            >
              Iniciar sesión como Conductor
            </button>
          </div>
        </div>
      </IosModal>

    </div>
  );
};
