export interface AdminDoc {
  id: string;
  path: string;
  data: Record<string, any>;
}

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

const TZ = 'America/La_Paz';

/** Acepta {__ts}, milisegundos (> año 1973) o texto de fecha. */
export function toMs(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && typeof v.__ts === 'number') return v.__ts;
  if (typeof v === 'number') return v > 1e11 ? v : null;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

const dateFmt = new Intl.DateTimeFormat('es-BO', {
  timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});
const dateFmtYear = new Intl.DateTimeFormat('es-BO', {
  timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const fmtDate = (ms: number | null, withYear = false) =>
  ms ? (withYear ? dateFmtYear : dateFmt).format(new Date(ms)) : '—';

export function fmtAgo(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 10) return 'ahora mismo';
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export const money = (n: any) =>
  typeof n === 'number' && Number.isFinite(n) ? `Bs ${Number.isInteger(n) ? n : n.toFixed(2)}` : '—';

const TIME_KEYS = [
  'createdAtMs', 'createdAt', 'completedAtMs', 'acceptedAtMs', 'approvedAtMs',
  'rejectedAtMs', 'updatedAt', 'lastActive', 'submittedAtMs',
];

/** Momento más reciente de un documento: sirve para ordenar de nuevo a viejo. */
export function recency(d: AdminDoc): number {
  let best = 0;
  for (const k of TIME_KEYS) {
    const ms = toMs(d.data[k]);
    if (ms && ms > best) best = ms;
  }
  return best;
}

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  SEARCHING_DRIVER: { label: 'Buscando conductor', tone: 'warn' },
  NEGOTIATING: { label: 'Negociando precio', tone: 'warn' },
  GOING_TO_PASSENGER: { label: 'Conductor en camino', tone: 'info' },
  TRIP_STARTED: { label: 'En viaje', tone: 'info' },
  IN_PROGRESS: { label: 'En viaje', tone: 'info' },
  COMPLETED: { label: 'Terminado', tone: 'good' },
  CANCELLED: { label: 'Cancelado', tone: 'bad' },
  PENDING: { label: 'Pendiente', tone: 'warn' },
  APPROVED: { label: 'Aprobada', tone: 'good' },
  REJECTED: { label: 'Rechazada', tone: 'bad' },
  FAILED: { label: 'Falló el envío', tone: 'bad' },
  CONFIRMED: { label: 'Confirmado', tone: 'good' },
  ACCEPTED: { label: 'Aceptado', tone: 'good' },
  EN_TRANSITO: { label: 'En tránsito', tone: 'info' },
  ENTREGADO: { label: 'Entregado', tone: 'good' },
};

/** Estados de un viaje que todavía no terminó ni se canceló. */
export const ACTIVE_RIDE_STATUSES = ['SEARCHING_DRIVER', 'NEGOTIATING', 'GOING_TO_PASSENGER', 'TRIP_STARTED', 'IN_PROGRESS'];
/** Un pedido "activo" sin movimiento por más de esto se considera abandonado. */
export const STALE_RIDE_MS = 3 * 60 * 60 * 1000;

STATUS.STALE = { label: 'Sin cerrar (antiguo)', tone: 'neutral' };

/** Estado real de un viaje: los pedidos abandonados hace horas no son "en curso". */
export function rideStatus(d: AdminDoc): string {
  const st = d.data.status;
  if (ACTIVE_RIDE_STATUSES.includes(st) && recency(d) < Date.now() - STALE_RIDE_MS) return 'STALE';
  return st;
}

export const statusInfo = (s: any) =>
  STATUS[String(s)] ?? { label: s ? String(s) : '—', tone: 'neutral' as Tone };

export const SERVICE: Record<string, string> = {
  MOTOTAXI: 'Mototaxi', MOTOCAR: 'Motocar', TAXI_AUTO: 'Taxi Auto', REMOLCADA: 'Remolcada',
};
export const serviceLabel = (s: any) => SERVICE[String(s)] ?? (s ? String(s) : '—');

export const ROLE: Record<string, string> = { DRIVER: 'Conductor', PASSENGER: 'Pasajero' };
export const roleLabel = (r: any) => ROLE[String(r)] ?? (r ? String(r) : '—');

/** Nombre de un lugar guardado como texto o como {name, lat, lng}. */
export function placeName(p: any): string {
  if (!p) return '—';
  if (typeof p === 'string') return p;
  return p.name || p.address || '—';
}

export function stars(rating: any, count?: any): string {
  if (typeof rating !== 'number') return 'Sin calificar';
  const c = typeof count === 'number' && count > 0 ? ` (${count})` : '';
  return `★ ${rating.toFixed(1)}${c}`;
}

/** Primer valor definido entre varias claves. */
export const pick = (d: AdminDoc, ...keys: string[]) => {
  for (const k of keys) {
    const v = d.data[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

/** Un conductor sin señal por más de esto ya no está realmente conectado. */
export const ONLINE_FRESH_MS = 2 * 60 * 1000;
export const isOnlineFresh = (d: AdminDoc) => {
  const ms = toMs(d.data.lastActive);
  return Boolean(ms && Date.now() - ms <= ONLINE_FRESH_MS);
};
