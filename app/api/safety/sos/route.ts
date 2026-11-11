import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notifyAdmin, verifyCaller } from '@/lib/safety';

export const runtime = 'nodejs';

const ACTIVE = ['GOING_TO_PASSENGER', 'TRIP_STARTED', 'ACCEPTED', 'IN_PROGRESS'];

/** Botón SOS del pasajero durante el viaje: queda registrado en el panel y avisa por Telegram. */
export async function POST(req: NextRequest) {
  const uid = await verifyCaller(req);
  if (!uid) return NextResponse.json({ ok: false, error: 'Inicia sesión de nuevo.' }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Servicio no disponible.' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 }); }
  const rideId = String(body?.rideId || '').slice(0, 120);
  const lat = Number(body?.lat), lng = Number(body?.lng);
  const hasPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const ride = (await db.collection('rides').doc(rideId).get()).data();
  if (!ride || ride.passengerId !== uid) return NextResponse.json({ ok: false, error: 'No encontramos tu viaje.' }, { status: 404 });
  if (!ACTIVE.includes(String(ride.status))) return NextResponse.json({ ok: false, error: 'El viaje ya no está en curso.' }, { status: 409 });

  // Evita avisos repetidos por toques seguidos: uno por minuto y por viaje.
  const recent = await db.collection('sos_alerts').where('rideId', '==', rideId).limit(20).get();
  const now = Date.now();
  if (recent.docs.some((d) => now - Number(d.data().createdAtMs || 0) < 60_000)) {
    return NextResponse.json({ ok: true, already: true });
  }

  const [pSnap, dSnap, msgsSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    ride.driverId ? db.collection('users').doc(ride.driverId).get() : Promise.resolve(null),
    db.collection('rides').doc(rideId).collection('messages').limit(100).get(),
  ]);
  const passenger = pSnap.data() || {};
  const driver = dSnap?.data() || {};
  const lastMessages = msgsSnap.docs
    .map((d) => d.data())
    .map((m) => ({ sender: m.sender === 'DRIVER' ? 'DRIVER' : 'PASSENGER', text: String(m.text || '').slice(0, 500), createdAtMs: Number(m.createdAtMs) || 0 }))
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .slice(-15);

  await db.collection('sos_alerts').add({
    type: 'SOS',
    status: 'OPEN',
    title: 'Alerta SOS del pasajero',
    rideId,
    passengerId: uid,
    passengerName: passenger.name || ride.passengerName || 'Sin nombre',
    passengerPhone: passenger.phone || ride.passengerPhone || '',
    driverId: ride.driverId || '',
    driverName: driver.name || ride.driverName || 'Sin nombre',
    driverPhone: driver.phone || '',
    driverPlate: driver.plate || '',
    driverVehicle: [driver.vehicleType, driver.motorcycle].filter(Boolean).join(' · '),
    rideStatus: ride.status,
    pickup: ride.pickup || null,
    destination: ride.destination || null,
    passengerLocation: hasPos ? { lat, lng } : null,
    lastMessages,
    createdAtMs: now,
    createdAt: FieldValue.serverTimestamp(),
  });

  const where = hasPos ? `\n📍 https://www.google.com/maps?q=${lat},${lng}` : '';
  await notifyAdmin(
    `🆘 ALERTA SOS\n\nPasajero: ${passenger.name || 'Usuario'} ${passenger.phone || ''}\nConductor: ${driver.name || 'Sin nombre'} ${driver.phone || ''}\nVehículo: ${[driver.motorcycle, driver.plate].filter(Boolean).join(' · ') || '—'}\nDestino: ${ride.destination?.name || '—'}${where}\n\nDetalle en /admin → Seguridad.`
  );
  return NextResponse.json({ ok: true });
}
