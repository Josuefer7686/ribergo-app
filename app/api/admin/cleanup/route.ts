import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isAdminRequest } from '@/lib/adminAuth';
import { runCleanup } from '@/lib/cleanup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** "Limpiar datos viejos" desde el panel. No borra usuarios ni historial. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, result: await runCleanup(db) });
  } catch (e) {
    console.error('cleanup falló:', e);
    return NextResponse.json({ ok: false, error: 'No se pudo completar la limpieza.' }, { status: 500 });
  }
}
