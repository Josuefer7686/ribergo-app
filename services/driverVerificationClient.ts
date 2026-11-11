import { auth, isFirebaseConfigured } from '@/lib/firebase';

export type VerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED';
export type DriverVehicleType = 'MOTOTAXI' | 'MOTOCAR' | 'TAXI_AUTO';

export interface DriverVehicleInfo {
  type: DriverVehicleType;
  model: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string;
}

export interface VehicleDraft { type: DriverVehicleType; model: string; photo: string }

export interface VerificationInfo {
  status: VerificationStatus;
  rejectReason: string;
  fullName: string;
  vehicles: DriverVehicleInfo[];
}

export interface DriverCard {
  verified: boolean;
  fullName: string;
  vehicleModel: string;
  vehiclePhoto: string;
  facePhoto: string;
}

export interface VerificationPayload {
  fullName: string;
  idNumber: string;
  facePhoto: string;
  vehicles: VehicleDraft[];
  idFront: string;
  idBack: string;
  liveFrame: string;
  faceDistance: number | null;
  livenessPassed: boolean;
  challenges: string[];
}

async function token(): Promise<string | null> {
  try {
    await auth.authStateReady();
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export const verificationEnabled = () => isFirebaseConfigured();

export async function fetchVerification(): Promise<VerificationInfo | null> {
  const t = await token();
  if (!t) return null;
  try {
    const res = await fetch('/api/driver/verify', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' });
    const json = await res.json();
    return res.ok && json.ok ? { status: json.status, rejectReason: json.rejectReason, fullName: json.fullName, vehicles: json.vehicles || [] } : null;
  } catch {
    return null;
  }
}

export async function submitVerification(payload: VerificationPayload): Promise<{ ok: boolean; error?: string }> {
  const t = await token();
  if (!t) return { ok: false, error: 'Vuelve a iniciar sesión para continuar.' };
  try {
    const res = await fetch('/api/driver/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && json.ok ? { ok: true } : { ok: false, error: json.error || 'No se pudo enviar. Intenta otra vez.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta otra vez.' };
  }
}

const cardCache = new Map<string, DriverCard>();

/** Tarjeta de identidad del conductor de un viaje (solo la ve quien participa en él). */
export async function fetchDriverCard(rideId: string): Promise<DriverCard | null> {
  const cached = cardCache.get(rideId);
  if (cached) return cached;
  const t = await token();
  if (!t) return null;
  try {
    const res = await fetch(`/api/driver/card?rideId=${encodeURIComponent(rideId)}`, { headers: { Authorization: `Bearer ${t}` } });
    const json = await res.json();
    if (!res.ok || !json.ok) return null;
    const card: DriverCard = { verified: !!json.verified, fullName: json.fullName || '', vehicleModel: json.vehicleModel || '', vehiclePhoto: json.vehiclePhoto || '', facePhoto: json.facePhoto || '' };
    if (card.verified) cardCache.set(rideId, card);
    return card;
  } catch {
    return null;
  }
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  const t = await token();
  if (!t) return { ok: false, error: 'Vuelve a iniciar sesión para continuar.' };
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return res.ok && json.ok ? json : { ok: false, error: json.error || 'No se pudo completar. Intenta otra vez.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta otra vez.' };
  }
}

/** Un conductor ya verificado registra más vehículos (solo foto y modelo). */
export const addVehicles = (vehicles: VehicleDraft[]) => post('/api/driver/vehicles', { action: 'add', vehicles });

/** Elige con qué vehículo aprobado trabaja. */
export const activateVehicle = (type: DriverVehicleType) =>
  post('/api/driver/vehicles', { action: 'activate', type }) as Promise<{ ok: boolean; error?: string; vehicleType?: DriverVehicleType; motorcycle?: string }>;
