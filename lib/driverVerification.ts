import 'server-only';

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
