import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyCaller } from '@/lib/safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Tarjeta de identidad del conductor para el pasajero de ESE viaje
 * (foto del vehículo, rostro, nombre completo y modelo). Nadie más puede pedirla.
 */
export async function GET(req: NextRequest) {
  const uid = await verifyCaller(req);
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });

  const rideId = String(req.nextUrl.searchParams.get('rideId') || '').slice(0, 120);
  const ride = rideId ? (await db.collection('rides').doc(rideId).get()).data() : null;
  if (!ride || !ride.driverId || (ride.passengerId !== uid && ride.driverId !== uid)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const [ver, media, vehSnap] = await Promise.all([
    db.collection('driver_verifications').doc(ride.driverId).get(),
    db.collection('driver_media').doc(ride.driverId).get(),
    db.collection('driver_vehicles').where('driverId', '==', ride.driverId).get(),
  ]);
  const v = ver.data();
  const m = media.data();
  if (!v || v.status !== 'APPROVED') return NextResponse.json({ ok: true, verified: false });
  // El vehículo del viaje: el del tipo pedido; si no, cualquiera aprobado
  const approved = vehSnap.docs.filter((d) => d.data().status === 'APPROVED');
  const chosen = approved.find((d) => d.data().type === ride.vehicleType) || approved[0];
  const photo = chosen ? (await db.collection('driver_vehicle_photos').doc(chosen.id).get()).data()?.photo : '';
  return NextResponse.json({
    ok: true,
    verified: true,
    fullName: v.fullName || '',
    vehicleModel: chosen?.data().model || '',
    vehiclePhoto: photo || '',
    facePhoto: m?.facePhoto || '',
  });
}
