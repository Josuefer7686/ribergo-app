import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isAdminRequest } from '@/lib/adminAuth';
import { resolvePerson, resolveVehicle, type PersonAction, type VehicleAction } from '@/lib/driverVerification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fotos de una solicitud (el panel las pide solo al abrir el detalle, no en la lista). */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });
  const id = String(req.nextUrl.searchParams.get('id') || '');
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  if (req.nextUrl.searchParams.get('kind') === 'vehicle') {
    const photo = (await db.collection('driver_vehicle_photos').doc(id).get()).data()?.photo || '';
    return NextResponse.json({ ok: true, images: { vehicle: photo } });
  }
  const [media, docs, vehicles] = await Promise.all([
    db.collection('driver_media').doc(id).get(),
    db.collection('driver_id_docs').doc(id).get(),
    db.collection('driver_vehicles').where('driverId', '==', id).get(),
  ]);
  const vehicleList = await Promise.all(
    vehicles.docs.map(async (d) => ({
      id: d.id,
      type: d.data().type,
      model: d.data().model,
      status: d.data().status,
      photo: (await db.collection('driver_vehicle_photos').doc(d.id).get()).data()?.photo || '',
    })),
  );
  return NextResponse.json({ ok: true, images: { ...(media.data() || {}), ...(docs.data() || {}) }, vehicles: vehicleList });
}

/** Acciones del administrador: aprobar, rechazar, segunda oportunidad, banear. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const reason = String(body.reason || '');
  if (!id) return NextResponse.json({ ok: false, error: 'Pedido inválido' }, { status: 400 });

  let res: { ok: boolean; error?: string };
  if (body.kind === 'vehicle') {
    if (!['approve', 'reject', 'delete'].includes(body.action)) return NextResponse.json({ ok: false, error: 'Acción inválida' }, { status: 400 });
    res = await resolveVehicle(db, id, body.action as VehicleAction, reason);
  } else {
    if (!['approve', 'reject', 'reset', 'ban', 'unban'].includes(body.action)) return NextResponse.json({ ok: false, error: 'Acción inválida' }, { status: 400 });
    res = await resolvePerson(db, id, body.action as PersonAction, reason);
  }
  return NextResponse.json(res.ok ? { ok: true } : { ok: false, error: res.error }, { status: res.ok ? 200 : 400 });
}
