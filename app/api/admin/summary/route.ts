import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isAdminRequest } from '@/lib/adminAuth';
import { ADMIN_COLLECTIONS } from '@/lib/adminCollections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Cuántos documentos hay en cada colección (consulta barata: count()). */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });

  const counts: Record<string, number | null> = {};
  await Promise.all(
    ADMIN_COLLECTIONS.map(async (c) => {
      try {
        const q = c.kind === 'group' ? db.collectionGroup(c.path) : db.collection(c.path);
        counts[c.id] = (await q.count().get()).data().count;
      } catch (e) {
        console.warn('count() falló para', c.id, e);
        counts[c.id] = null;
      }
    })
  );
  return NextResponse.json({ ok: true, counts, at: Date.now() });
}
