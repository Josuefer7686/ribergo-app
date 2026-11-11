'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminDoc } from './format';

export type LiveStatus = 'connecting' | 'live' | 'error';

interface Live {
  docs: AdminDoc[];
  status: LiveStatus;
  /** Cuándo llegó el último dato */
  at: number | null;
  truncated: boolean;
  /** IDs que acaban de aparecer (para resaltarlos unos segundos) */
  fresh: Set<string>;
}

/**
 * Suscribe el panel, en vivo, a una colección. Se reconecta solo cuando el
 * servidor rota la conexión, se pausa si la pestaña no está a la vista y avisa
 * si la sesión ya no es válida.
 */
export function useLiveCollection(id: string | null, onUnauthorized: () => void): Live {
  const [state, setState] = useState<Omit<Live, 'fresh'>>({ docs: [], status: 'connecting', at: null, truncated: false });
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => {
    unauthorized.current = onUnauthorized;
  });

  useEffect(() => {
    if (!id) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let failures = 0;
    let first = true;
    seen.current = new Set();

    const open = () => {
      if (stopped || document.hidden) return;
      es?.close();
      es = new EventSource(`/api/admin/stream?c=${encodeURIComponent(id)}`);

      es.addEventListener('snapshot', (e) => {
        failures = 0;
        const payload = JSON.parse((e as MessageEvent).data);
        const docs: AdminDoc[] = payload.docs;
        if (!first) {
          const appeared = docs.filter((d) => !seen.current.has(d.path)).map((d) => d.path);
          if (appeared.length) {
            setFresh((prev) => new Set([...prev, ...appeared]));
            setTimeout(() => setFresh((prev) => {
              const next = new Set(prev);
              appeared.forEach((p) => next.delete(p));
              return next;
            }), 4000);
          }
        }
        first = false;
        seen.current = new Set(docs.map((d) => d.path));
        setState({ docs, status: 'live', at: payload.at, truncated: payload.truncated, });
      });
      es.addEventListener('reconnect', () => {
        es?.close();
        retry = setTimeout(open, 200);
      });
      es.addEventListener('fail', () => setState((s) => ({ ...s, status: 'error' })));
      es.onerror = async () => {
        es?.close();
        failures += 1;
        setState((s) => ({ ...s, status: failures > 1 ? 'error' : 'connecting' }));
        // ¿Se acabó la sesión?
        try {
          const r = await fetch('/api/admin/login', { cache: 'no-store' });
          const j = await r.json();
          if (!j.ok) return unauthorized.current();
        } catch {}
        retry = setTimeout(open, Math.min(15_000, 1000 * 2 ** failures));
      };
    };

    const onVisibility = () => {
      if (document.hidden) {
        es?.close();
        if (retry) clearTimeout(retry);
      } else {
        open();
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia al cambiar de colección
    setState({ docs: [], status: 'connecting', at: null, truncated: false });
    open();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      es?.close();
      if (retry) clearTimeout(retry);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [id]);

  return { ...state, fresh };
}
