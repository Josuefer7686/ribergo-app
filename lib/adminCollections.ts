/**
 * Catálogo de colecciones que muestra el panel de administración, explicadas
 * en lenguaje sencillo. Es seguro importarlo desde el navegador (sin secretos).
 */

export type CollectionGroupId = 'seguridad' | 'personas' | 'viajes' | 'dinero' | 'terminal' | 'sistema';

export interface AdminCollection {
  /** Identificador estable que usa la URL del panel */
  id: string;
  /** Ruta real en Firestore */
  path: string;
  /** 'group' lee la subcolección en todos los viajes a la vez */
  kind: 'collection' | 'group';
  label: string;
  /** Qué es, en una frase para alguien que no es técnico */
  description: string;
  group: CollectionGroupId;
}

export const GROUP_LABELS: Record<CollectionGroupId, string> = {
  seguridad: 'Seguridad',
  personas: 'Personas',
  viajes: 'Viajes',
  dinero: 'Dinero',
  terminal: 'Terminal interprovincial',
  sistema: 'Sistema',
};

export const ADMIN_COLLECTIONS: AdminCollection[] = [
  {
    id: 'sos_alerts', path: 'sos_alerts', kind: 'collection', group: 'seguridad',
    label: 'Alertas SOS',
    description: 'Cada vez que un pasajero pulsa el botón SOS durante un viaje: quién es, con qué conductor va, dónde está y los últimos mensajes.',
  },
  {
    id: 'chat_reports', path: 'chat_reports', kind: 'collection', group: 'seguridad',
    label: 'Observaciones en el chat',
    description: 'Reportes de apodos ofensivos, malas palabras o acoso. Cada uno guarda el chat completo, los datos de la persona reportada y la fecha.',
  },
  {
    id: 'users', path: 'users', kind: 'collection', group: 'personas',
    label: 'Usuarios',
    description: 'Todas las personas registradas en RiberGO: pasajeros y conductores, con su teléfono, calificación y saldo.',
  },
  {
    id: 'online_drivers', path: 'online_drivers', kind: 'collection', group: 'personas',
    label: 'Conductores conectados',
    description: 'Los conductores que están en línea ahora mismo y aparecen en el mapa. Si se desconectan, desaparecen de aquí.',
  },
  {
    id: 'driver_boxes', path: 'driver_boxes', kind: 'collection', group: 'personas',
    label: 'Cuaderno de conductores',
    description: 'La libreta de cada conductor: cuánto ganó hoy y en total, cuántos viajes hizo y sus calificaciones.',
  },
  {
    id: 'rides', path: 'rides', kind: 'collection', group: 'viajes',
    label: 'Pedidos de viaje',
    description: 'Cada viaje que pide un pasajero, desde que busca conductor hasta que termina o se cancela.',
  },
  {
    id: 'active_requests', path: 'active_requests', kind: 'collection', group: 'viajes',
    label: 'Pedidos esperando conductor',
    description: 'Copia rápida de los pedidos para que los conductores los vean al instante. Se borran al cancelarse.',
  },
  {
    id: 'trips_history', path: 'trips_history', kind: 'collection', group: 'viajes',
    label: 'Historial de viajes',
    description: 'Respaldo permanente de los viajes terminados. Aquí queda el registro aunque el pedido original se borre.',
  },
  {
    id: 'messages', path: 'messages', kind: 'group', group: 'viajes',
    label: 'Mensajes del chat',
    description: 'Lo que se escriben pasajero y conductor durante un viaje, de todos los viajes juntos.',
  },
  {
    id: 'wallet_recharges', path: 'wallet_recharges', kind: 'collection', group: 'dinero',
    label: 'Recargas de saldo',
    description: 'Solicitudes de los conductores para cargar saldo por QR. Pendientes esperan tu aprobación en Telegram.',
  },
  {
    id: 'terminal_departures', path: 'terminal_departures', kind: 'collection', group: 'terminal',
    label: 'Salidas programadas',
    description: 'Los viajes de vagoneta Riberalta ↔ Guayaramerín con su hora, precio y asientos ocupados.',
  },
  {
    id: 'terminal_bookings', path: 'terminal_bookings', kind: 'collection', group: 'terminal',
    label: 'Pasajes reservados',
    description: 'Los asientos que reservaron los pasajeros en las salidas de la terminal.',
  },
  {
    id: 'terminal_expresos', path: 'terminal_expresos', kind: 'collection', group: 'terminal',
    label: 'Expresos puerta a puerta',
    description: 'Pedidos de un auto privado que recoge al pasajero en su casa y lo lleva a Guayaramerín.',
  },
  {
    id: 'terminal_encomiendas', path: 'terminal_encomiendas', kind: 'collection', group: 'terminal',
    label: 'Encomiendas',
    description: 'Paquetes enviados entre Riberalta y Guayaramerín, con su código de rastreo.',
  },
  {
    id: 'system_config', path: 'system_config', kind: 'collection', group: 'sistema',
    label: 'Configuración interna',
    description: 'Ajustes internos del sistema. Normalmente no necesitas tocar nada aquí.',
  },
];

export const findCollection = (id: string) => ADMIN_COLLECTIONS.find((c) => c.id === id);
