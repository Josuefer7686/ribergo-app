import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isAdminRequest } from '@/lib/adminAuth';
import { findCollection } from '@/lib/adminCollections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_DOCS = 500;
/** Pasado este tiempo el servidor avisa y el panel se reconecta solo. */
const SESSION_MS = 55_000;

/** Convierte tipos de Firestore a JSON simple para el navegador. */
function serialize(value: any): any {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value?.toMillis === 'function') return { __ts: value.toMillis() };
  if (value instanceof Date) return { __ts: value.getTime() };
  if (typeof value?.latitude === 'number' && typeof value?.longitude === 'number' && Object.keys(value).length <= 4) {
    return { __geo: [value.latitude, value.longitude] };
  }
  if (typeof value?.path === 'string' && typeof value?.firestore === 'object') return { __ref: value.path };
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

/**
 * Transmite en vivo (Server-Sent Events) el contenido de una colección.
 * Cada cambio en la base de datos llega al panel al instante.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const cfg = findCollection(req.nextUrl.searchParams.get('c') || '');
  if (!cfg) return NextResponse.json({ ok: false, error: 'Colección desconocida' }, { status: 400 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ ok: false, error: 'Firebase Admin sin configurar' }, { status: 503 });

  const base = cfg.kind === 'group' ? db.collectionGroup(cfg.path) : db.collection(cfg.path);
  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      const unsubscribe = base.limit(MAX_DOCS).onSnapshot(
        (snap) => {
          send('snapshot', {
            total: snap.size,
            truncated: snap.size >= MAX_DOCS,
            docs: snap.docs.map((d) => ({ id: d.id, path: d.ref.path, data: serialize(d.data()) })),
            at: Date.now(),
          });
        },
        (err) => {
          console.error('Stream admin error:', cfg.id, err);
          send('fail', { message: 'No se pudo leer esta colección.' });
          cleanup();
        }
      );

      const keepAlive = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(': ping\n\n')); } catch {}
        }
      }, 15_000);
      const rotate = setTimeout(() => {
        send('reconnect', {});
        cleanup();
      }, SESSION_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        clearTimeout(rotate);
        unsubscribe();
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener('abort', () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
