# MANUAL DE CONTEXTO TÉCNICO Y ARQUITECTURA DE RIBERGO APP
> **Documento maestro para Claude y asistentes de IA.**  
> Contiene la especificación completa del sistema, arquitectura, listado detallado de archivos, base de datos, flujos de usuario, integraciones y comandos operativos.

---

## 1. VISIÓN GENERAL DE LA APLICACIÓN

### ¿Qué es RiberGO?
**RiberGO** es una Progressive Web App (PWA) de transporte y logística diseñada específicamente para la ciudad de **Riberalta** y la ruta interprovincial **Riberalta ↔ Guayaramerín** (Departamento del Beni, Bolivia).

### Modalidades del Sistema
1. **Transporte Urbano en Riberalta:**
   - **Mototaxi:** El transporte más popular de Riberalta (precio base sugerido: 10 BOB). Opción de auxilio "remolcada con pie".
   - **Taxi Auto:** Transporte en vehículos de 4 ruedas (precio base en chat: 35 BOB). Sin opción de remolcada.
   - **Motocar:** Transporte de carga ligera o pasajeros en torito/motocarro (precio base en chat: 50 BOB). Sin opción de remolcada.
2. **Terminal Interprovincial (Riberalta ↔ Guayaramerín):**
   - Salidas programadas de vagonetas (Toyota Noah / Toyota Ipsum).
   - Selección interactiva de asientos en mapa 3D/2D del vehículo.
   - Contratación de "Expresos" privados puerta a puerta.
   - Envío y seguimiento de "Encomiendas" con código de rastreo.
3. **Billetera Digital del Conductor (Wallet):**
   - Sistema de saldo prepagado por QR (Yasta / Al Toque de Banco Unión / bancos bolivianos).
   - Verificación automatizada con Bot de Telegram (`@RiberGoBot`) con botones de 1 toque `[ ✅ Aprobar ]` / `[ ❌ Rechazar ]`.
   - Experiencia háptica estilo Apple Pay, banner superior iOS Dynamic Island y canal oficial de soporte en mensajes.

---

## 2. STACK TECNOLÓGICO Y DEPENDENCIAS

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Framework Web** | Next.js (App Router) | `15.1.7` (React 19) |
| **Lenguaje** | TypeScript | `5.9.3` (Modo estricto) |
| **Estilos** | Tailwind CSS | `4.1.11` + tw-animate-css |
| **Animaciones** | Framer Motion (`motion`) | `12.23.24` |
| **Gestor de Estado** | Zustand + persist | `5.0.15` (Guardado en `localStorage` con clave `ribergo-session-v1`) |
| **Base de Datos & Auth** | Google Cloud Firestore & Firebase Auth | `12.19.0` |
| **Mapas** | Leaflet + React-Leaflet | `1.9.4` con OpenStreetMap |
| **Audio** | Web Audio API nativa | Síntesis procedural en tiempo real (`AudioContext`), sin archivos MP3 pesados |
| **Hápticos** | Navigator Vibrate API | Patrones rítmicos estilo iOS (`[20, 40, 25, 45, 60]`) |
| **PWA & Offline** | Service Worker nativo | `public/sw.js` (Versión `ribergo-v2.8`), caché Stale-While-Revalidate con bypass a `/api/*` |
| **Hosting & Deploy** | Vercel Serverless | Dominio: `https://ribergoo.vercel.app` (Conectado a GitHub `origin/main`) |
| **Bot Telegram** | Telegram Bot API | `@RiberGoBot` (token SOLO en variables de entorno, ver §6) |

---

## 3. ARQUITECTURA Y LISTADO EXHAUSTIVO DE ARCHIVOS

### 3.1. Raíz y Configuración
- [`package.json`](package.json): Dependencias, scripts (`dev`, `build`, `start`, `lint`).
- [`tsconfig.json`](tsconfig.json): Configuración de TypeScript con alias `@/*` apuntando a la raíz.
- [`next.config.ts`](next.config.ts): Configuración de Next.js, optimizaciones PWA e imágenes.
- [`firestore.rules`](firestore.rules): Reglas completas de seguridad para Cloud Firestore.
- [`firebase.json`](firebase.json): Configuración de proyecto Firebase.
- [`.env.local`](.env.local) / [`.env`](.env): Variables de entorno locales y tokens.

### 3.2. Directorio `app/` (Next.js App Router)
- [`app/page.tsx`](app/page.tsx): Punto de entrada principal. Controla el cambio de vistas de la máquina de estados: `SPLASH` -> `LOGIN` / `REGISTER` -> `ROLE_SELECTION` -> `MAIN_APP`. Registra el Service Worker y observa la sesión de Firebase Auth.
- [`app/layout.tsx`](app/layout.tsx): Layout raíz. Configura metatags de PWA, viewport móvil (`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`), fuentes y tema oscuro.
- [`app/globals.css`](app/globals.css): Definición de tokens de diseño, colores institucionales (Gold Primary `#FFC61A`, Gold Light `#FFD84D`, Obsidian Background `#05080B`, Surface `#0B1116`, Surface-2 `#111920`), utilidades para iOS Safe Area (`pt-safe`, `pb-safe`) y scrollbars invisibles.
- [`app/not-found.tsx`](app/not-found.tsx): Página 404 personalizada con redirección a inicio.
- [`app/api/wallet/request-topup/route.ts`](app/api/wallet/request-topup/route.ts): **Ruta Serverless POST.** Recibe el FormData del comprobante de pago subido por el chofer, guarda la solicitud en Firestore (`wallet_recharges`), y envía inmediatamente la fotografía a Telegram con el caption formateado y los botones de aprobación rápida inline.
- [`app/api/wallet/telegram-webhook/route.ts`](app/api/wallet/telegram-webhook/route.ts): **Ruta Serverless POST.** Webhook oficial de Telegram. Procesa comandos de texto (`/start`) y clics en botones inline (`approve:rec-xxx`, `reject:rec-xxx`). Acredita atómicamente el saldo en `users/{driverId}.walletBalance`, actualiza Firestore y edita el mensaje en Telegram.

### 3.3. Directorio `components/views/` (Vistas Principales)
- [`SplashView.tsx`](components/views/SplashView.tsx): Pantalla de inicio con logo animado de RiberGO, aura dorada y animación de carga.
- [`LoginView.tsx`](components/views/LoginView.tsx): Inicio de sesión con Google Popup o mediante Teléfono/Contraseña, teclado numérico y validación de credenciales.
- [`RegisterView.tsx`](components/views/RegisterView.tsx): Formulario de registro de nuevos usuarios (Nombre, teléfono boliviano +591, correo, avatar).
- [`RoleSelectionView.tsx`](components/views/RoleSelectionView.tsx): **Selección Permanente de Rol.** El usuario escoge una sola vez entre "Pasajero" o "Conductor". Si escoge Conductor, selecciona su vehículo inicial (Mototaxi, Taxi Auto o Motocar). Una vez elegido, no puede alternar roles.
- [`MainAppView.tsx`](components/views/MainAppView.tsx): Contenedor maestro de la aplicación una vez logueado. Monta la barra de navegación inferior, los modales de permisos de ubicación GPS, el banner de Toast de mensajes en carrera y el banner superior **Dynamic Island** para alertas de recarga de saldo.
- [`PassengerHome.tsx`](components/views/PassengerHome.tsx): Pantalla principal del pasajero: mapa interactivo con conductores en vivo, selector de servicio (Mototaxi/Auto/Motocar/Remolcada), fijación de origen y destino, caja de oferta de tarifa, negociación y seguimiento en tiempo real.
- [`DriverHome.tsx`](components/views/DriverHome.tsx): Pantalla principal del conductor: switch de conexión ONLINE/OFFLINE, radar de solicitudes entrantes, temporizador de 15 segundos con avisos sonoros/hápticos de urgencia, panel de carrera activa y chat.
- [`IncomeView.tsx`](components/views/IncomeView.tsx): Pantalla de ingresos y billetera del chofer. Tarjeta digital con saldo en BOB, desglose de ganancias de hoy vs histórico, botón de recarga QR y lista de viajes realizados.
- [`MessagesView.tsx`](components/views/MessagesView.tsx): Centro de mensajes. Incluye el canal oficial fijado **"Billetera & Finanzas RiberGO"** (historial de comprobantes y recargas aprobadas), además del chat en vivo durante la carrera con mensajes predefinidos y teclado adaptativo.
- [`ProfileView.tsx`](components/views/ProfileView.tsx): Perfil de usuario, estadísticas de viajes, calificaciones en estrellas, configuración de sonido/hápticos, botón para choferes de "Cambiar tipo de vehículo" y cierre de sesión.
- [`TripsView.tsx`](components/views/TripsView.tsx): Historial detallado de carreras anteriores completadas, fechas, costos y conductores/pasajeros.

### 3.4. Directorio `components/modals/` (Ventanas Modales)
- [`QrTopupModal.tsx`](components/modals/QrTopupModal.tsx): Modal de recarga de saldo por QR. Selector de montos (10, 20, 50, 100 BOB), generación de QR dinámico, selector de archivo de comprobante, animación de confirmación estilo Apple Pay (`receiptSentChime` + `iosPaymentProcessing`), aros concéntricos pulsantes con checkmark SVG y escucha en tiempo real.
- [`DriverVehicleModal.tsx`](components/modals/DriverVehicleModal.tsx): Modal para que el conductor cambie su vehículo activo (Mototaxi, Motocar, Taxi Auto) desde su perfil, actualizando Firestore.
- [`DriverWalletTutorialModal.tsx`](components/modals/DriverWalletTutorialModal.tsx): Tutorial interactivo de bienvenida para nuevos conductores (explica las comisiones justas, los 5 viajes de regalo y cómo recargar).
- [`IosLocationPermissionModal.tsx`](components/modals/IosLocationPermissionModal.tsx): Modal estilo iOS que solicita de forma amigable el permiso de geolocalización GPS nativa.
- [`NegotiationChatModal.tsx`](components/modals/NegotiationChatModal.tsx): Modal flotante de contraoferta y negociación de tarifas entre pasajero y conductor.
- [`SmartPwaInstallModal.tsx`](components/modals/SmartPwaInstallModal.tsx): Modal inteligente que detecta si el usuario está en Android (evento `beforeinstallprompt`) o iOS Safari (guía paso a paso "Compartir -> Agregar al inicio").

### 3.5. Directorio `components/shared/` (Componentes Reutilizables)
- [`BottomNavigation.tsx`](components/shared/BottomNavigation.tsx): Barra de navegación inferior móvil con pestañas dinámicas según el rol (pasajero: Inicio, Mis viajes, Mensajes, Mi cuenta; conductor: Inicio, Viajes, Ingresos, Perfil), con retroalimentación háptica.
- [`IosDynamicIslandNotification.tsx`](components/shared/IosDynamicIslandNotification.tsx): Banner flotante superior estilo Dynamic Island de iOS 18 para notificaciones de recarga de saldo aprobadas/rechazadas, deslizable para descartar con auto-cierre.
- [`IosMessageToast.tsx`](components/shared/IosMessageToast.tsx): Notificación flotante superior para nuevos mensajes de chat durante un viaje cuando el usuario no está en la pestaña de mensajes.
- [`IosModal.tsx`](components/shared/IosModal.tsx): Envoltorio base para modales con fondo difuminado, tirador superior para arrastrar y animaciones suaves de entrada/salida.
- [`IosSpinner.tsx`](components/shared/IosSpinner.tsx): Indicador de carga circular con las aspas clásicas de iOS.
- [`IosToastOverlay.tsx`](components/shared/IosToastOverlay.tsx): Overlay a pantalla completa con spinner o checkmark gigante para operaciones críticas.
- [`CustomNumericKeypad.tsx`](components/shared/CustomNumericKeypad.tsx): Teclado numérico táctil personalizado para montos o teléfonos con sonidos de tecleo procedurales.
- [`OtpPinInput.tsx`](components/shared/OtpPinInput.tsx): Entradas de casillas individuales para códigos SMS de verificación.
- [`PwaInstallBanner.tsx`](components/shared/PwaInstallBanner.tsx): Barra fija superior/inferior para invitar a instalar la app en el dispositivo.
- [`RiberGoCard.tsx`](components/shared/RiberGoCard.tsx): Tarjetas contenedoras con bordes de cristal y sombras obsidian.
- [`IosMapLoader.tsx`](components/shared/IosMapLoader.tsx): Placeholder de carga elegante para cuando el mapa de Leaflet se está montando en el navegador.

### 3.6. Directorio `components/passenger/` y `components/terminal/`
- [`BottomSheet.tsx`](components/passenger/BottomSheet.tsx): Panel inferior arrastrable (solo el asa arrastra; se esconde dejando el título y vibra en oleada). Contenido con scroll propio y botón principal fijo al pie.
- [`DestinationSearch.tsx`](components/passenger/DestinationSearch.tsx): Buscador con autocompletado sobre `RIBERALTA_DESTINATIONS` (45 lugares con coordenadas de OpenStreetMap y alias). Elegir un lugar muestra el botón **Ir**, que abre el panel de confirmación (`CONFIRMING`).
- [`ServicePicker.tsx`](components/passenger/ServicePicker.tsx): Selector de tipos de vehículos urbanos con iconos oficiales nativos.
- [`OfferStepper.tsx`](components/passenger/OfferStepper.tsx): Botón redondo con el precio y botones −/+ (de 1 en 1 hasta 20 Bs, luego de 5 en 5; 5–200 Bs). Se usa al confirmar y mientras se busca conductor (con radar).
- [`SafetyBanner.tsx`](components/passenger/SafetyBanner.tsx): Consejos de seguridad y verificación de placa del conductor.
- [`TerminalView.tsx`](components/terminal/TerminalView.tsx): Interfaz de la Terminal Interprovincial Riberalta ↔ Guayaramerín (Salidas, Expresos y Encomiendas).
- [`SeatPickerModal.tsx`](components/terminal/SeatPickerModal.tsx): Selector interactivo de asientos en vagonetas Noah / Ipsum.

### 3.6b. Panel de administración (`/admin`)
Visor en vivo de Firestore en español, solo para el dueño. **Lee por el servidor** (Admin SDK) porque las reglas cierran la base a los clientes.
- [`app/admin/`](app/admin): página y layout (noindex, pantalla completa). La app móvil vive en el grupo `app/(app)/`.
- [`app/api/admin/login`](app/api/admin/login/route.ts): contraseña → cookie `rg_admin` httpOnly, firmada, 12 h; 5 intentos por IP cada 10 min. [`lib/adminAuth.ts`](lib/adminAuth.ts).
- [`app/api/admin/stream`](app/api/admin/stream/route.ts): SSE en vivo por colección (`onSnapshot`, se reconecta cada 55 s); [`summary`](app/api/admin/summary/route.ts): conteos; [`names`](app/api/admin/names/route.ts): id → nombre (caché 5 min).
- [`lib/adminCollections.ts`](lib/adminCollections.ts): catálogo y descripciones de cada colección. Para añadir una colección nueva: agregarla aquí y sus columnas en [`components/admin/columns.tsx`](components/admin/columns.tsx).
- Solo lectura: el panel no escribe nada en la base de datos.

### 3.6c. Seguridad del pasajero y chats
- **SOS** ([`SosButton.tsx`](components/passenger/SosButton.tsx)): visible durante el viaje; aviso de 3 s solo con vibración (sin sonido, cancelable) y luego `POST /api/safety/sos` → documento en `sos_alerts` + aviso por Telegram al admin.
- **Reporte de chat** (`POST /api/safety/report`): el servidor copia el chat real, datos del reportado y fecha a `chat_reports` ("Observación en el chat"). Ambas colecciones son solo-servidor y se ven en `/admin` → Seguridad. Las rutas verifican el token de Firebase (`lib/safety.ts`).
- **Mensajes**: el canal "Billetera & Finanzas" es solo para conductores. El chat de un viaje terminado queda de solo lectura (también en `firestore.rules`); se borra de la lista con pulsación larga (`hiddenChatIds`, solo local).

### 3.6d. Verificación de conductores (identidad)
- Los conductores **no entran a la app** hasta ser aprobados: [`DriverVerificationGate.tsx`](components/driver/DriverVerificationGate.tsx) envuelve `MainAppView` (asistente de 6 pasos: nombre completo, carnet, modelo de vehículo, foto del vehículo, carnet anverso/reverso, rostro en vivo).
- Rostro: [`lib/faceEngine.ts`](lib/faceEngine.ts) (face-api.js cargado desde jsDelivr, en el teléfono). Prueba de vida con parpadeo + giro a ambos lados en orden aleatorio; compara el rostro con el del carnet (distancia ≤ 0.6; tras 3 intentos fallidos pasa marcada "Revisar a mano"). No es infalible: **la aprobación final es humana**.
- Servidor (`/api/driver/verify`, `/api/driver/card`, `/api/admin/verification`): fotos en `driver_media` (vehículo y rostro) y `driver_id_docs` (carnet, solo admin); estado en `driver_verifications`. Aprobar/rechazar se hace en `/admin` → Seguridad → Verificación de conductores (única acción de escritura del panel); aprobar pone `users.verified = true`.
- El pasajero ve foto del vehículo, rostro, nombre completo y modelo ([`DriverIdentityCard.tsx`](components/driver/DriverIdentityCard.tsx)) cuando un conductor aprueba acepta su viaje; solo los participantes del viaje pueden pedir esa tarjeta.
- Sin placa por ahora (en Riberalta casi no existen).

### 3.7. Directorio `components/map/`
- [`MapComponent.tsx`](components/map/MapComponent.tsx): Componente Leaflet con marcadores personalizados (pasajero, conductores cercanos, rutas trazadas y radio de búsqueda).
- [`MapView.tsx`](components/map/MapView.tsx): Envoltorio cliente con importación dinámica (`next/dynamic` con `ssr: false`) para evitar errores de compilación del objeto `window` en Next.js.

### 3.8. Directorio `store/`
- [`useAppStore.ts`](store/useAppStore.ts): **Cerebro del estado de RiberGO.**
  - Tipos: `UserProfile`, `ActiveTripInfo`, `PendingRechargeState`, `WalletNotificationItem`, `ServiceType`, etc.
  - Estado: `user`, `role`, `currentView`, `activeTab`, `activeTrip`, `driverState`, `passengerState`, `pendingRecharge`, `walletNotifications`.
  - Acciones: `loginUser()`, `topUpWallet()`, `deductWalletCommission()`, `setPendingRecharge()`, `addWalletNotification()`, `resetRide()`.
  - Persistencia: Solo sincroniza claves esenciales en `localStorage` mediante `partialize`.

### 3.9. Directorio `services/`
- [`apiService.ts`](services/apiService.ts): Servicio de comunicación con Firebase Firestore y Auth:
  - Manejo de usuarios (`saveUserProfileFirestore`, `updateUserProfileFirestore`).
  - Solicitudes de carreras en tiempo real (`createRideRequest`, `listenToRideRequest`, `acceptRideRequest`, `cancelRideRequest`, `completeTrip`).
  - Chat en vivo (`sendMessage`, `subscribeToMessages`).
  - Casillero único del conductor (`getDriverBox`, `subscribeToDriverBox`, `addTripToDriverBox`).
  - Recargas de billetera (`submitRechargeRequest`, `subscribeToRecharge`, `topUpDriverWallet`).
  - Terminal interprovincial y encomiendas.
- [`mockData.ts`](services/mockData.ts): Datos geográficos de Riberalta (`RIBERALTA_CENTER`), conductores simulados para pruebas de radar y lista de puntos de interés.

### 3.10. Directorio `utils/` y `hooks/`
- [`utils/audio.ts`](utils/audio.ts): Síntesis de sonido Web Audio API (`driverIncomingRequest`, `driverUrgentWarning`, `driverCountdownTick`, `receiptSentChime`, `walletApprovedChime`, `keyTick`, etc.).
- [`utils/haptics.ts`](utils/haptics.ts): API de vibraciones táctiles (`selection`, `impact`, `heavy`, `success`, `notification`, `iosPaymentProcessing`, `walletApprovalSuccess`).
- [`utils/notifications.ts`](utils/notifications.ts): Controlador de Notificaciones Web nativas (`isSupported`, `requestPermission`, `sendNativeNotification`).
- [`utils/geo.ts`](utils/geo.ts) / [`utils/routing.ts`](utils/routing.ts): Cálculos de distancia por fórmula de Haversine y estimación de tiempos de viaje.
- [`utils/pwa.ts`](utils/pwa.ts): Detección de standalone PWA y helpers de instalación.
- [`hooks/useAutoLocation.ts`](hooks/useAutoLocation.ts): Hook de obtención y seguimiento GPS en tiempo real con `navigator.geolocation.watchPosition`.
- [`hooks/useWalletNotificationListener.ts`](hooks/useWalletNotificationListener.ts): Hook global que vigila `pendingRecharge` en Firestore y dispara sonido, hápticos, banner Dynamic Island y notificaciones nativas en segundo plano al aprobarse una recarga.
- [`public/sw.js`](public/sw.js): Service Worker para funcionamiento offline, instalación PWA y caché de activos críticos, protegiendo peticiones POST y rutas `/api/*`.

---

## 4. BASE DE DATOS: CLOUD FIRESTORE

### 4.1. Esquema de Colecciones

#### 1. `users/{userId}`
Perfiles de usuarios (Pasajeros y Choferes).
```json
{
  "id": "drv-firebase-uid",
  "name": "Josué Fernando Maita",
  "phone": "+59176868110",
  "email": "conductor@ribergo.bo",
  "role": "DRIVER",
  "vehicleType": "MOTOTAXI",
  "motorcycle": "Honda Wave 110",
  "plate": "RBT-4820",
  "walletBalance": 45.00,
  "accountNumber": "RBT-4820-9182",
  "freeTripsRemaining": 5,
  "hasSelectedRole": true,
  "rating": 4.95,
  "trips": 124,
  "updatedAt": "Timestamp"
}
```

#### 2. `wallet_recharges/{rechargeId}`
Registro de solicitudes de recarga por QR.
```json
{
  "id": "rec-1793941732271",
  "driverId": "drv-firebase-uid",
  "driverName": "Josué Fernando",
  "driverPhone": "+59176868110",
  "vehicle": "MOTOTAXI - Honda Wave 110",
  "amount": 20.00,
  "currentBalance": 25.00,
  "status": "APPROVED", // "PENDING" | "APPROVED" | "REJECTED"
  "createdAtMs": 1793941732271,
  "formattedDate": "06/11/2026, 01:08:52",
  "approvedAtMs": 1793941780000
}
```

#### 3. `system_config/telegram_admin`
Configuración del Administrador que recibe las solicitudes en Telegram.
```json
{
  "chatId": "6344399294",
  "adminName": "Josué Fernando Maita Arteaga",
  "updatedAt": "Timestamp"
}
```

#### 4. `driver_boxes/{driverId}`
Casillero forense de ingresos diarios y acumulados del conductor.
```json
{
  "driverId": "drv-firebase-uid",
  "totalIncome": 380.00,
  "todayIncome": 95.00,
  "todayDate": "2026-11-06",
  "totalTrips": 22,
  "ratingsCount": 18,
  "ratingsSum": 90,
  "rating": 5.0,
  "trips": [
    {
      "id": "trip-01",
      "date": "Hoy",
      "time": "14:20",
      "pickup": "Mercado Central",
      "destination": "Barrio Los Tajibos",
      "price": 10,
      "passengerName": "María López"
    }
  ]
}
```

#### 5. `rides/{rideId}` y `active_requests/{requestId}`
Carreras urbanas activas en negociación o en curso.
```json
{
  "id": "ride-9921",
  "passengerId": "usr-pass-1",
  "passengerName": "Carlos Mendoza",
  "passengerPhone": "+59171123456",
  "driverId": "drv-firebase-uid",
  "serviceType": "MOTOTAXI",
  "pickup": { "lat": -11.0067, "lng": -66.0642, "name": "Plaza Principal" },
  "destination": { "lat": -11.0125, "lng": -66.0710, "name": "Hospital General" },
  "price": 10.00,
  "proposedPrice": 12.00,
  "priceOfferedBy": "DRIVER",
  "fareAgreed": true,
  "status": "IN_PROGRESS" // "SEARCHING" | "NEGOTIATING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
}
```

#### 6. `rides/{rideId}/messages/{messageId}`
Chat en vivo entre pasajero y conductor dentro del viaje.

#### 7. `online_drivers/{driverId}`
Ubicación GPS viva de los conductores transmitiendo al mapa general.

#### 8. `terminal_departures`, `terminal_bookings`, `terminal_expresos`, `terminal_encomiendas`
Colecciones de viajes interprovinciales y paquetería entre Riberalta y Guayaramerín.

---

## 4b. CICLO DE VIDA DE LOS DATOS (evita datos "activos" fantasma)

- **Presencia de conductores:** `online_drivers/{id}.lastActive` se renueva con cada movimiento GPS y con un **latido cada 30 s** (`DriverHome` → `apiService.touchDriverPresence`). El mapa del pasajero **oculta** a quien lleve más de 2 min sin señal (`DRIVER_PRESENCE_TTL_MS`); el servidor borra a los de más de 5 min.
- **Viajes:** al **cancelar**, el viaje queda como `CANCELLED` (con su chat) y se borra su copia de `active_requests`. Al **completar**, se actualiza `rides`, se escribe `trips_history` y se borra la copia de `active_requests`. Los pedidos activos sin movimiento por 3 h se marcan `CANCELLED` con `expired: true`.
- **Limpieza automática:** [`lib/cleanup.ts`](lib/cleanup.ts) (`runCleanup`) corre a diario (cron) y a pedido con el botón **Limpiar datos viejos** del panel. Nunca borra usuarios, historial, mensajes ni dinero.
- **Mantenimiento manual:** `node scripts/db-maintenance.mjs counts | backup | wipe --yes <colecciones> | reset-counters --yes`. `wipe` hace respaldo previo en `backups/` (ignorada por git) y nunca borra `users`.

---

## 5. REGLAS DE NEGOCIO CRÍTICAS (NO MODIFICAR SIN PERMISO)

1. **Inmutabilidad de Rol:** Un usuario registrado como pasajero **NO puede convertirse en conductor** con la misma cuenta. Si intenta trabajar, la app le indica que debe registrarse con otra cuenta de conductor independiente.
2. **Ubicación del cambio de vehículo:** La pantalla de inicio del conductor (`DriverHome.tsx`) **debe mantenerse limpia y enfocada en el mapa y la aceptación de viajes**. El cambio entre Mototaxi, Taxi Auto o Motocar se realiza exclusivamente dentro de `ProfileView.tsx` ("Cambiar tipo de vehículo").
2b. **Precio estilo inDrive (sin regateo en el chat):** el pasajero ofrece un precio y puede **subirlo/bajarlo en vivo mientras busca** (`apiService.updateRideOffer`, solo si nadie aceptó). El conductor ve el precio cambiar en la tarjeta de solicitud y **acepta por ese precio** (`apiService.acceptRide(rideId, driver, seenPrice)`, transacción: gana el primero y solo si el precio no cambió). Al aceptar pasa directo a `GOING_TO_PASSENGER`; el estado `NEGOTIATING` ya no se usa. El chat queda solo para coordinar. Si el destino lo escribió el pasajero (`destination.isCustom`), su app lo envía solo al chat cuando un conductor acepta.
3. **Precios Base (oferta inicial sugerida):**
   - **Mototaxi:** 10 BOB (admite opción de auxilio mecánico / remolcada con pie).
   - **Taxi Auto:** 35 BOB (NO admite remolcada con pie).
   - **Motocar:** 50 BOB (NO admite remolcada con pie).
4. **Verificación del Pago por QR:** El saldo **NUNCA se acredita automáticamente al subir una foto**. Debe viajar a Telegram, ser verificado por el administrador y approved mediante el webhook antes de sumarse a la billetera.
5. **Rutas `/api/*` y Service Worker:** `public/sw.js` **nunca debe cachear ni responder en peticiones a `/api/`**, evitando errores de `Request method 'POST' is unsupported`.

---

## 6. CREDENCIALES Y VARIABLES DE ENTORNO

| Variable | Valor / Descripción |
| :--- | :--- |
| **Dominio de Producción** | `https://ribergoo.vercel.app` (¡Ojo con las dos 'o's!) |
| **Repositorio GitHub** | `https://github.com/Josuefer7686/ribergo-app.git` |
| **Rama principal** | `main` |
| **Telegram Bot Token** | `TELEGRAM_BOT_TOKEN` (solo en Vercel y `.env.local`; **nunca** en el código ni en este archivo) |
| **Telegram Admin Chat ID** | `TELEGRAM_ADMIN_CHAT_ID` (variable de entorno; solo este usuario puede aprobar recargas) |
| **Panel admin** | `ADMIN_PANEL_PASSWORD` (≥ 8 caracteres) y `ADMIN_SESSION_SECRET` (≥ 32; `openssl rand -hex 32`). Sin ellas `/admin` no deja entrar |
| **Limpieza diaria** | `CRON_SECRET` (16+ caracteres). Vercel Cron llama a `/api/cron/cleanup` cada día (ver `vercel.json`); sin el secreto responde 401 |
| **Firebase Admin** | `FIREBASE_SERVICE_ACCOUNT_B64` (JSON de cuenta de servicio en base64; solo servidor) |
| **Telegram Webhook Secret** | `TELEGRAM_WEBHOOK_SECRET` (cadena larga aleatoria; se registra con `secret_token` en `setWebhook`) |
| **Webhook URL** | `https://ribergoo.vercel.app/api/wallet/telegram-webhook` |
| **Firebase Project ID** | `ribergo-app` |
| **Firebase Auth Domain** | `ribergo-app.firebaseapp.com` |

---

## 7. COMANDOS OPERATIVOS DE DESARROLLO Y GITHUB

### Ejecución Local
```bash
# Instalar dependencias
npm install

# Correr en servidor de desarrollo local
npm run dev

# Verificar validez de tipos de TypeScript (sin compilar)
npx tsc --noEmit

# Compilar para producción (comprueba rutas y dependencias)
npm run build
```

### Flujo de Subida a GitHub y Despliegue en Vercel
Vercel está conectado directamente al repositorio de GitHub `Josuefer7686/ribergo-app`. Cada vez que se hace un `push` a la rama `main`, Vercel compila y despliega en producción automáticamente:

```bash
# 1. Ver qué archivos han cambiado
git status

# 2. Agregar todos los cambios
git add .

# 3. Hacer el commit con un mensaje claro y descriptivo
git commit -m "feat: descripción de los cambios implementados"

# 4. Enviar a GitHub (dispara el despliegue en Vercel)
git push origin main
```

### Consultar o Reconfigurar el Webhook de Telegram
Las variables `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` deben estar exportadas en tu terminal (nunca pegues el token en archivos versionados):
```bash
# Ver estado del Webhook
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"

# Registrar el Webhook con secret_token (Telegram lo enviará en la cabecera X-Telegram-Bot-Api-Secret-Token)
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://ribergoo.vercel.app/api/wallet/telegram-webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

---

## 8. SEGURIDAD Y DINERO (LEER ANTES DE TOCAR LA BILLETERA)

- **El saldo lo acredita solo el servidor.** El webhook aprueba/rechaza en una transacción de Firestore (PENDING → APPROVED/REJECTED una sola vez) y suma con `increment()`. El cliente **nunca** escribe un saldo de recarga: lo lee con `apiService.fetchWalletBalance()`.
- **El webhook exige** la cabecera `X-Telegram-Bot-Api-Secret-Token` y que quien pulse el botón sea `TELEGRAM_ADMIN_CHAT_ID`. Monto y conductor salen del documento `wallet_recharges`, jamás del texto del mensaje.
- **`/api/wallet/request-topup`** valida montos permitidos (10/20/50/100 BOB), tamaño e imagen, y lee el saldo del servidor.
- **Comisiones** (`deductTripCommission`, `decrementDriverFreeTrips`) usan transacciones sobre el saldo real.
- **Reglas de Firestore (`firestore.rules`) cerradas.** Todo exige sesión; sin regla comodín. El saldo (`walletBalance`) y los viajes de regalo solo pueden **bajar** desde el cliente; subirlos es exclusivo del servidor. `wallet_recharges` y `system_config` son solo-servidor. El rol se elige una vez. Los viajes/chat solo los editan sus participantes. Hay 28 pruebas: `npm run test:rules` (necesita Java).
- **Firebase Admin (servidor):** `lib/firebaseAdmin.ts` lee la credencial de `FIREBASE_SERVICE_ACCOUNT_B64` (JSON de la cuenta de servicio en base64). Lo usan el webhook y `request-topup`, porque el Admin SDK ignora las reglas. Sin esa variable ambas rutas responden 503.
- **Riesgos que quedan (aceptados por ahora):** la comisión por viaje y las calificaciones se escriben desde el cliente (un conductor tramposo podría no descontarse la comisión o un pasajero manipular una calificación). Para blindarlo hay que moverlos a rutas de servidor.
- Nunca subas tokens, claves ni `.env*` al repositorio. Si se filtra un token, revócalo en @BotFather (`/revoke`).
