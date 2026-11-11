import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';

export type VerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED';
export type VehicleType = 'MOTOTAXI' | 'MOTOCAR' | 'TAXI_AUTO';
export const VEHICLE_TYPES: VehicleType[] = ['MOTOTAXI', 'MOTOCAR', 'TAXI_AUTO'];

const MAX_BYTES = { facePhoto: 200_000, idFront: 230_000, idBack: 230_000, liveFrame: 200_000, vehicle: 260_000 } as const;
export type ImageKey = keyof typeof MAX_BYTES;
export const PERSON_IMAGE_KEYS: ImageKey[] = ['facePhoto', 'idFront', 'idBack', 'liveFrame'];

/** Acepta solo JPEG en data URL y con tamaño razonable (las fotos llegan ya comprimidas). */
export function validImage(value: unknown, key: ImageKey): value is string {
  if (typeof value !== 'string' || !value.startsWith('data:image/jpeg;base64,')) return false;
  const approxBytes = Math.floor(((value.length - 23) * 3) / 4);
  return approxBytes > 2_000 && approxBytes <= MAX_BYTES[key];
}

export const cleanText = (v: unknown, max: number) =>
  String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export const vehicleDocId = (uid: string, type: string) => `${uid}_${type}`;

export interface VehicleInput { type: VehicleType; model: string; photo: string }

/** Valida la lista de vehículos del pedido. Devuelve un texto de error o los vehículos limpios. */
export function parseVehicles(raw: unknown): { error: string } | { vehicles: VehicleInput[] } {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 3) return { error: 'Elige al menos un vehículo.' };
  const seen = new Set<string>();
  const vehicles: VehicleInput[] = [];
  for (const v of raw as any[]) {
    const type = v?.type as VehicleType;
    if (!VEHICLE_TYPES.includes(type) || seen.has(type)) return { error: 'Tipo de vehículo no válido.' };
    seen.add(type);
    const model = cleanText(v?.model, 60);
    if (model.length < 3) return { error: 'Escribe el nombre o modelo de cada vehículo.' };
    if (!validImage(v?.photo, 'vehicle')) return { error: 'Falta o es muy pesada la foto de un vehículo. Vuelve a tomarla.' };
    vehicles.push({ type, model, photo: v.photo });
  }
  return { vehicles };
}

/** Guarda los vehículos (pendientes de revisión) de un conductor. */
export async function saveVehicles(db: Firestore, uid: string, driverName: string, vehicles: VehicleInput[]) {
  for (const v of vehicles) {
    const id = vehicleDocId(uid, v.type);
    await db.collection('driver_vehicle_photos').doc(id).set({ photo: v.photo, updatedAtMs: Date.now() });
    await db.collection('driver_vehicles').doc(id).set({
      driverId: uid,
      driverName,
      type: v.type,
      model: v.model,
      status: 'PENDING',
      rejectReason: '',
      createdAtMs: Date.now(),
    });
  }
}

async function deleteVehicles(db: Firestore, uid: string) {
  const snap = await db.collection('driver_vehicles').where('driverId', '==', uid).get();
  await Promise.all(snap.docs.flatMap((d) => [d.ref.delete(), db.collection('driver_vehicle_photos').doc(d.id).delete()]));
}

export type PersonAction = 'approve' | 'reject' | 'reset' | 'ban' | 'unban';

/** Acciones del administrador sobre la persona (identidad). */
export async function resolvePerson(db: Firestore, id: string, action: PersonAction, reason = ''): Promise<{ ok: boolean; error?: string }> {
  const ref = db.collection('driver_verifications').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'No existe la solicitud' };
  const now = Date.now();
  if (action === 'approve') {
    if (snap.data()?.status === 'BANNED') return { ok: false, error: 'Está baneado: quítale el baneo primero.' };
    await ref.update({ status: 'APPROVED', rejectReason: '', resolvedAtMs: now });
    await db.collection('users').doc(id).set({ verified: true, banned: false }, { merge: true });
    // Aprobar a la persona aprueba también los vehículos que mandó en el mismo registro
    const pending = await db.collection('driver_vehicles').where('driverId', '==', id).where('status', '==', 'PENDING').get();
    await Promise.all(pending.docs.map((d) => d.ref.update({ status: 'APPROVED', rejectReason: '', resolvedAtMs: now })));
  } else if (action === 'reject') {
    await ref.update({ status: 'REJECTED', rejectReason: cleanText(reason, 200) || 'Datos o fotos no válidos.', resolvedAtMs: now });
    await db.collection('users').doc(id).set({ verified: false }, { merge: true });
  } else if (action === 'reset') {
    // Segunda oportunidad: se borra todo el historial y vuelve a registrarse desde cero
    await Promise.all([
      ref.delete(),
      db.collection('driver_media').doc(id).delete(),
      db.collection('driver_id_docs').doc(id).delete(),
      deleteVehicles(db, id),
      db.collection('users').doc(id).set({ verified: false, banned: false }, { merge: true }),
    ]);
  } else if (action === 'ban') {
    await ref.update({ status: 'BANNED', rejectReason: cleanText(reason, 200) || 'Cuenta suspendida por la administración.', resolvedAtMs: now });
    await db.collection('users').doc(id).set({ verified: false, banned: true }, { merge: true });
  } else {
    await ref.update({ status: 'REJECTED', rejectReason: 'Tu cuenta fue reactivada. Envía tus datos de nuevo.', resolvedAtMs: now });
    await db.collection('users').doc(id).set({ banned: false }, { merge: true });
  }
  return { ok: true };
}

export type VehicleAction = 'approve' | 'reject' | 'delete';

export async function resolveVehicle(db: Firestore, id: string, action: VehicleAction, reason = ''): Promise<{ ok: boolean; error?: string }> {
  const ref = db.collection('driver_vehicles').doc(id);
  if (!(await ref.get()).exists) return { ok: false, error: 'No existe el vehículo' };
  if (action === 'approve') await ref.update({ status: 'APPROVED', rejectReason: '', resolvedAtMs: Date.now() });
  else if (action === 'reject') await ref.update({ status: 'REJECTED', rejectReason: cleanText(reason, 200) || 'La foto o los datos no eran claros.', resolvedAtMs: Date.now() });
  else await Promise.all([ref.delete(), db.collection('driver_vehicle_photos').doc(id).delete()]);
  return { ok: true };
}

/** Estado completo de un conductor para la app. */
export async function loadDriverState(db: Firestore, uid: string) {
  const [ver, vehSnap] = await Promise.all([
    db.collection('driver_verifications').doc(uid).get(),
    db.collection('driver_vehicles').where('driverId', '==', uid).get(),
  ]);
  const data = ver.data();
  const vehicles = vehSnap.docs.map((d) => {
    const v = d.data();
    return { type: v.type as VehicleType, model: String(v.model || ''), status: String(v.status || 'PENDING'), rejectReason: String(v.rejectReason || '') };
  });
  return {
    status: (data?.status || 'NONE') as VerificationStatus,
    rejectReason: String(data?.rejectReason || ''),
    fullName: String(data?.fullName || ''),
    vehicles,
  };
}
