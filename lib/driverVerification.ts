import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';

export type VerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

const MAX_BYTES = { vehiclePhoto: 260_000, facePhoto: 200_000, idFront: 230_000, idBack: 230_000, liveFrame: 200_000 } as const;
export type ImageKey = keyof typeof MAX_BYTES;
export const IMAGE_KEYS = Object.keys(MAX_BYTES) as ImageKey[];

/** Acepta solo JPEG en data URL y con tamaño razonable (las fotos llegan ya comprimidas). */
export function validImage(value: unknown, key: ImageKey): value is string {
  if (typeof value !== 'string' || !value.startsWith('data:image/jpeg;base64,')) return false;
  const approxBytes = Math.floor(((value.length - 23) * 3) / 4);
  return approxBytes > 2_000 && approxBytes <= MAX_BYTES[key];
}

export const cleanText = (v: unknown, max: number) =>
  String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

/** Aprueba o rechaza una verificación (lo usan el panel y los botones de Telegram). */
export async function resolveVerification(
  db: Firestore,
  id: string,
  action: 'approve' | 'reject',
  reason = '',
): Promise<{ ok: boolean; error?: string; fullName?: string; already?: string }> {
  const ref = db.collection('driver_verifications').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: 'No existe la solicitud' };
  const data = snap.data() || {};
  if (action === 'approve') {
    await ref.update({ status: 'APPROVED', rejectReason: '', resolvedAtMs: Date.now() });
    await db.collection('users').doc(id).set({ verified: true }, { merge: true });
  } else {
    await ref.update({ status: 'REJECTED', rejectReason: cleanText(reason, 200) || 'Datos o fotos no válidos.', resolvedAtMs: Date.now() });
    await db.collection('users').doc(id).set({ verified: false }, { merge: true });
  }
  return { ok: true, fullName: data.fullName };
}
