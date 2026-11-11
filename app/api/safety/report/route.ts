import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notifyAdmin, verifyCaller } from '@/lib/safety';

export const runtime = 'nodejs';

const REASONS = ['Apodo ofensivo', 'Malas palabras', 'Acoso o amenazas', 'Otro motivo'];

/**
 * Reporte de un chat. El servidor copia la conversación real desde Firestore
 * (el cliente no puede inventar ni alterar las pruebas) y la guarda en
 * `chat_reports` para revisarla en el panel.
 */
export async function POST(req: NextRequest) {
  const uid = await verifyCaller(req);
  if (!uid) return NextResponse.json({ ok: false, error: 'Inicia sesión de nuevo.' }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Servicio no disponible.' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 }); }
  const rideId = String(body?.rideId || '').slice(0, 120);
  const reason = REASONS.includes(body?.reason) ? body.reason : 'Otro motivo';
  const note = String(body?.note || '').slice(0, 400);
  if (!rideId) return NextResponse.json({ ok: false, error: 'Falta el viaje.' }, { status: 400 });

  const rideSnap = await db.collection('rides').doc(rideId).get();
  const ride = rideSnap.data();
  if (!ride) return NextResponse.json({ ok: false, error: 'No encontramos ese viaje.' }, { status: 404 });

  const isPassenger = ride.passengerId === uid;
  const isDriver = ride.driverId === uid;
  if (!isPassenger && !isDriver) return NextResponse.json({ ok: false, error: 'No participaste en este viaje.' }, { status: 403 });

  const reportedId: string = (isPassenger ? ride.driverId : ride.passengerId) || '';
  if (!reportedId) return NextResponse.json({ ok: false, error: 'Este viaje no tuvo otra persona.' }, { status: 400 });

  const reportRef = db.collection('chat_reports').doc(`${rideId}_${uid}`);
  if ((await reportRef.get()).exists) return NextResponse.json({ ok: true, already: true });

  const [reporterSnap, reportedSnap, msgsSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('users').doc(reportedId).get(),
    db.collection('rides').doc(rideId).collection('messages').limit(500).get(),
  ]);
  const reporter = reporterSnap.data() || {};
  const reported = reportedSnap.data() || {};

  const messages = msgsSnap.docs
    .map((d) => d.data())
    .map((m) => ({
      sender: m.sender === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
      text: String(m.text || '').slice(0, 1000),
      createdAtMs: Number(m.createdAtMs) || 0,
    }))
    .sort((a, b) => a.createdAtMs - b.createdAtMs);

  const createdAtMs = Date.now();
  await reportRef.set({
    type: 'CHAT_REPORT',
    status: 'PENDING',
    title: 'Observación en el chat',
    rideId,
    reason,
    note,
    reporterId: uid,
    reporterRole: isPassenger ? 'PASSENGER' : 'DRIVER',
    reporterName: reporter.name || (isPassenger ? ride.passengerName : ride.driverName) || 'Sin nombre',
    reporterPhone: reporter.phone || '',
    reportedId,
    reportedRole: isPassenger ? 'DRIVER' : 'PASSENGER',
    reportedName: reported.name || (isPassenger ? ride.driverName : ride.passengerName) || 'Sin nombre',
    reportedPhone: reported.phone || '',
    reportedPlate: reported.plate || '',
    reportedVehicle: [reported.vehicleType, reported.motorcycle].filter(Boolean).join(' · '),
    rideStatus: ride.status || '',
    pickup: ride.pickup || null,
    destination: ride.destination || null,
    messages,
    messageCount: messages.length,
    createdAtMs,
    createdAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmin(
    `🚩 Observación en el chat\n\nMotivo: ${reason}\nReporta: ${reporter.name || 'Usuario'} (${isPassenger ? 'pasajero' : 'conductor'})\nReportado: ${reported.name || 'Usuario'} (${isPassenger ? 'conductor' : 'pasajero'}) ${reported.phone || ''}\nMensajes guardados: ${messages.length}\n\nRevísalo en el panel /admin → Seguridad.`
  );
  return NextResponse.json({ ok: true });
}
