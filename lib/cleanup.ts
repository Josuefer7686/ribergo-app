import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Mantenimiento de la base de datos: cierra lo que quedó "activo" por error.
 * Se ejecuta solo una vez al día (Vercel Cron) y a pedido desde el panel.
 * NUNCA borra usuarios, historial de viajes, mensajes ni dinero.
 */

const ACTIVE_RIDE_STATUSES = ['SEARCHING_DRIVER', 'NEGOTIATING', 'GOING_TO_PASSENGER', 'TRIP_STARTED', 'IN_PROGRESS'];
/** Conductor sin señal por más de esto: se desconecta (los pasajeros ya lo ocultan a los 2 min). */
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
/** Pedido activo sin movimiento por más de esto: se considera abandonado. */
export const STALE_RIDE_MS = 3 * 60 * 60 * 1000;
/** Pedido que sigue "buscando conductor" por más de esto: se cierra su copia rápida. */
export const STALE_REQUEST_MS = 30 * 60 * 1000;

const toMs = (v: any): number => {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'number') return v;
  return 0;
};

const recency = (data: Record<string, any>): number =>
  Math.max(
    0,
    ...['createdAtMs', 'createdAt', 'updatedAtMs', 'updatedAt', 'acceptedAtMs', 'acceptedAt', 'completedAtMs'].map((k) => toMs(data[k]))
  );

export interface CleanupResult {
  offlineDrivers: number;
  abandonedRides: number;
  closedRequests: number;
  at: number;
}

export async function runCleanup(db: Firestore): Promise<CleanupResult> {
  const now = Date.now();
  let batch = db.batch();
  let pending = 0;
  const flush = async (force = false) => {
    if (pending > 0 && (force || pending >= 400)) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  };

  // 1) Conductores "conectados" que dejaron de dar señal
  let offlineDrivers = 0;
  const drivers = await db.collection('online_drivers').get();
  for (const d of drivers.docs) {
    const last = toMs(d.data().lastActive);
    if (!last || now - last > PRESENCE_TTL_MS) {
      batch.delete(d.ref);
      pending++;
      offlineDrivers++;
      await flush();
    }
  }

  // 2) Pedidos activos que nadie cerró: se marcan cancelados (se conservan como historial)
  let abandonedRides = 0;
  const alive = new Set<string>();
  const activeRides = await db.collection('rides').where('status', 'in', ACTIVE_RIDE_STATUSES).get();
  for (const r of activeRides.docs) {
    if (now - recency(r.data()) > STALE_RIDE_MS) {
      batch.update(r.ref, {
        status: 'CANCELLED',
        expired: true,
        cancelledAtMs: now,
        updatedAt: FieldValue.serverTimestamp(),
      });
      pending++;
      abandonedRides++;
      await flush();
    } else {
      alive.add(r.id);
    }
  }

  // 3) Copias en "pedidos esperando conductor" que ya no corresponden a un viaje vivo
  let closedRequests = 0;
  const requests = await db.collection('active_requests').get();
  for (const q of requests.docs) {
    const data = q.data();
    const dead = !alive.has(q.id);
    const staleSearch = data.status === 'SEARCHING_DRIVER' && now - recency(data) > STALE_REQUEST_MS;
    if (dead || staleSearch) {
      batch.delete(q.ref);
      pending++;
      closedRequests++;
      await flush();
    }
  }

  await flush(true);
  return { offlineDrivers, abandonedRides, closedRequests, at: now };
}
