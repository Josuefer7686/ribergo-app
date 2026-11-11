import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notifyAdmin, verifyCaller } from '@/lib/safety';
import { VEHICLE_TYPES, loadDriverState, parseVehicles, saveVehicles, vehicleDocId, type VehicleType } from '@/lib/driverVerification';

export const runtime = 'nodejs';

/**
 * - add: un conductor ya verificado registra otro vehículo (sin carnet ni rostro).
 * - activate: elige con qué vehículo aprobado trabaja ahora.
 */
export async function POST(req: NextRequest) {
  const uid = await verifyCaller(req);
  if (!uid) return NextResponse.json({ ok: false, error: 'Inicia sesión de nuevo.' }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Servicio no disponible.' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 }); }

  const state = await loadDriverState(db, uid);
  if (state.status !== 'APPROVED') return NextResponse.json({ ok: false, error: 'Primero debes tener tu identidad aprobada.' }, { status: 403 });

  if (body.action === 'activate') {
    const type = body.type as VehicleType;
    const vehicle = state.vehicles.find((v) => v.type === type && v.status === 'APPROVED');
    if (!VEHICLE_TYPES.includes(type) || !vehicle) return NextResponse.json({ ok: false, error: 'Ese vehículo aún no está aprobado.' }, { status: 409 });
    await db.collection('users').doc(uid).set({ vehicleType: type, motorcycle: vehicle.model }, { merge: true });
    return NextResponse.json({ ok: true, vehicleType: type, motorcycle: vehicle.model });
  }

  if (body.action === 'add') {
    const parsed = parseVehicles(body.vehicles);
    if ('error' in parsed) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    const blocked = parsed.vehicles.find((v) => state.vehicles.some((x) => x.type === v.type && x.status !== 'REJECTED'));
    if (blocked) return NextResponse.json({ ok: false, error: 'Ese tipo de vehículo ya está registrado o en revisión.' }, { status: 409 });
    await saveVehicles(db, uid, state.fullName, parsed.vehicles);
    await notifyAdmin(
      `🚗 Nuevo vehículo por aprobar\n\n${state.fullName || 'Un conductor'}: ${parsed.vehicles.map((v) => v.model).join(', ')}\n\nRevísalo en el panel: /admin → Seguridad → Vehículos de conductores.`
    );
    return NextResponse.json({ ok: true });
  }

  void vehicleDocId;
  return NextResponse.json({ ok: false, error: 'Acción no válida.' }, { status: 400 });
}
