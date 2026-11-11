import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isAdminRequest } from '@/lib/adminAuth';
import { cleanText } from '@/lib/driverVerification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fotos de una solicitud (el panel las pide solo al abrir el detalle, no en la lista). */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });
  const id = String(req.nextUrl.searchParams.get('id') || '');
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const [media, docs] = await Promise.all([
    db.collection('driver_media').doc(id).get(),
    db.collection('driver_id_docs').doc(id).get(),
  ]);
  return NextResponse.json({ ok: true, images: { ...(media.data() || {}), ...(docs.data() || {}) } });
}

/** Aprobar o rechazar. Es la única acción de escritura del panel. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : '';
  if (!id || !action) return NextResponse.json({ ok: false, error: 'Pedido inválido' }, { status: 400 });

  const ref = db.collection('driver_verifications').doc(id);
  if (!(await ref.get()).exists) return NextResponse.json({ ok: false, error: 'No existe la solicitud' }, { status: 404 });

  if (action === 'approve') {
    await ref.update({ status: 'APPROVED', rejectReason: '', resolvedAtMs: Date.now() });
    await db.collection('users').doc(id).set({ verified: true }, { merge: true });
  } else {
    await ref.update({ status: 'REJECTED', rejectReason: cleanText(body.reason, 200) || 'Datos o fotos no válidos.', resolvedAtMs: Date.now() });
    await db.collection('users').doc(id).set({ verified: false }, { merge: true });
  }
  return NextResponse.json({ ok: true });
}
