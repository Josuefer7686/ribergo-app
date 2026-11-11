import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { runCleanup } from '@/lib/cleanup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Limpieza diaria automática (Vercel Cron, ver vercel.json).
 * Vercel envía "Authorization: Bearer <CRON_SECRET>"; sin ese secreto no corre.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const sent = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const ok =
    secret.length >= 16 &&
    sent.length === secret.length &&
    timingSafeEqual(Buffer.from(sent), Buffer.from(secret));
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, result: await runCleanup(db) });
  } catch (e) {
    console.error('cron cleanup falló:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
