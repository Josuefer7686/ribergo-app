import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { notifyAdmin, verifyCaller } from '@/lib/safety';
import { IMAGE_KEYS, cleanText, validImage } from '@/lib/driverVerification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Estado de verificación del conductor que pregunta. */
export async function GET(req: NextRequest) {
  const uid = await verifyCaller(req);
  if (!uid) return NextResponse.json({ ok: false, error: 'Inicia sesión de nuevo.' }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Servicio no disponible.' }, { status: 503 });
  const data = (await db.collection('driver_verifications').doc(uid).get()).data();
  return NextResponse.json({
    ok: true,
    status: data?.status || 'NONE',
    rejectReason: data?.rejectReason || '',
    fullName: data?.fullName || '',
  });
}

/** Envía la solicitud de verificación (datos + fotos ya comprimidas). */
export async function POST(req: NextRequest) {
  const uid = await verifyCaller(req);
  if (!uid) return NextResponse.json({ ok: false, error: 'Inicia sesión de nuevo.' }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Servicio no disponible.' }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Pedido inválido.' }, { status: 400 }); }

  const fullName = cleanText(body.fullName, 80);
  const idNumber = cleanText(body.idNumber, 20);
  const vehicleModel = cleanText(body.vehicleModel, 60);
  if (fullName.split(/\s+/).length < 2) return NextResponse.json({ ok: false, error: 'Escribe tu nombre completo.' }, { status: 400 });
  if (idNumber.length < 5) return NextResponse.json({ ok: false, error: 'Escribe tu número de carnet.' }, { status: 400 });
  if (vehicleModel.length < 3) return NextResponse.json({ ok: false, error: 'Escribe el nombre o modelo de tu vehículo.' }, { status: 400 });
  for (const k of IMAGE_KEYS) {
    if (!validImage(body[k], k)) return NextResponse.json({ ok: false, error: `Falta o es muy pesada la foto (${k}). Vuelve a tomarla.` }, { status: 400 });
  }
  if (body.livenessPassed !== true) return NextResponse.json({ ok: false, error: 'Falta la prueba de rostro en vivo.' }, { status: 400 });

  const user = (await db.collection('users').doc(uid).get()).data();
  if (!user || user.role !== 'DRIVER') return NextResponse.json({ ok: false, error: 'Solo los conductores se verifican.' }, { status: 403 });

  const ref = db.collection('driver_verifications').doc(uid);
  const current = (await ref.get()).data();
  if (current?.status === 'PENDING' || current?.status === 'APPROVED') {
    return NextResponse.json({ ok: true, status: current.status });
  }

  const score = Number(body.faceDistance);
  const faceDistance = Number.isFinite(score) ? Math.round(score * 1000) / 1000 : null;
  const matchLevel = faceDistance !== null && faceDistance <= 0.6 ? 'OK' : 'REVISAR';

  await Promise.all([
    db.collection('driver_media').doc(uid).set({
      vehiclePhoto: body.vehiclePhoto,
      facePhoto: body.facePhoto,
      updatedAtMs: Date.now(),
    }),
    db.collection('driver_id_docs').doc(uid).set({
      idFront: body.idFront,
      idBack: body.idBack,
      liveFrame: body.liveFrame,
      updatedAtMs: Date.now(),
    }),
  ]);
  await ref.set({
    status: 'PENDING',
    driverId: uid,
    fullName,
    idNumber,
    vehicleModel,
    phone: user.phone || '',
    faceDistance,
    faceMatch: matchLevel,
    livenessChallenges: Array.isArray(body.challenges) ? body.challenges.slice(0, 6).map((c: unknown) => cleanText(c, 20)) : [],
    createdAtMs: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
    rejectReason: '',
  });
  await db.collection('users').doc(uid).set({ fullName, vehicleModel, verified: false }, { merge: true });

  await notifyAdmin(
    `🪪 Nueva verificación de conductor\n\n${fullName}\nCarnet: ${idNumber}\nVehículo: ${vehicleModel}\nCoincidencia de rostro: ${matchLevel}${faceDistance !== null ? ` (${faceDistance})` : ''}\n\nRevísala y apruébala en /admin → Seguridad → Verificación de conductores.`
  );
  return NextResponse.json({ ok: true, status: 'PENDING' });
}
