import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; names: Record<string, { name: string; role: string }> } | null = null;

/**
 * id → nombre y rol, para que el panel muestre personas y no códigos.
 * Se guarda 5 minutos en memoria para no gastar lecturas de Firestore.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });

  if (!cache || Date.now() - cache.at > TTL_MS) {
    const snap = await db.collection('users').select('name', 'role').limit(5000).get();
    const names: Record<string, { name: string; role: string }> = {};
    snap.forEach((d) => {
      const data = d.data();
      names[d.id] = { name: String(data.name || 'Sin nombre'), role: String(data.role || '') };
    });
    cache = { at: Date.now(), names };
  }
  return NextResponse.json({ ok: true, names: cache.names });
}
