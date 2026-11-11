'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { ADMIN_COLLECTIONS, GROUP_LABELS, type CollectionGroupId, findCollection } from '@/lib/adminCollections';
import { AdminLogin } from './AdminLogin';
import { CollectionView } from './CollectionView';
import { Overview } from './Overview';
import type { Names } from './ui';

type Session = 'checking' | 'out' | 'in';

export function AdminApp() {
  const [session, setSession] = useState<Session>('checking');
  const [configured, setConfigured] = useState(true);
  const [view, setView] = useState<string>('overview');
  const [names, setNames] = useState<Names>({});
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  const checkSession = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/login', { cache: 'no-store' });
      const j = await r.json();
      setConfigured(Boolean(j.configured));
      setSession(j.ok ? 'in' : 'out');
    } catch {
      setSession('out');
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- comprobar la sesión al abrir
  useEffect(() => { checkSession(); }, [checkSession]);

  // La vista actual vive en la URL (#users) para poder recargar o compartir el enlace.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la URL al abrir
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace('#', '');
      setView(h && findCollection(h) ? h : 'overview');
    };
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('popstate', read);
    };
  }, []);

  const go = (id: string) => {
    window.history.pushState(null, '', id === 'overview' ? window.location.pathname : `#${id}`);
    setView(id);
  };

  const loggedOut = useCallback(() => setSession('out'), []);

  // Nombres de personas y conteos: se refrescan solos mientras la pestaña está a la vista.
  useEffect(() => {
    if (session !== 'in') return;
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const [n, s] = await Promise.all([
          fetch('/api/admin/names', { cache: 'no-store' }),
          fetch('/api/admin/summary', { cache: 'no-store' }),
        ]);
        if (n.status === 401 || s.status === 401) return loggedOut();
        const nj = await n.json();
        const sj = await s.json();
        if (!stop && nj.ok) setNames(nj.names);
        if (!stop && sj.ok) setCounts(sj.counts);
      } catch {}
    };
    load();
    const t = setInterval(load, 30_000);
    document.addEventListener('visibilitychange', load);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', load); };
  }, [session, loggedOut]);

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setSession('out');
  };

  if (session === 'checking') {
    return <div className="grid min-h-full place-items-center text-text-secondary">Cargando…</div>;
  }
  if (session === 'out') {
    return <AdminLogin configured={configured} onSuccess={() => setSession('in')} />;
  }

  const current = view === 'overview' ? null : findCollection(view) ?? null;
  const groups = (Object.keys(GROUP_LABELS) as CollectionGroupId[]).map((g) => ({
    id: g,
    items: ADMIN_COLLECTIONS.filter((c) => c.group === g),
  }));

  const navBtn = (id: string, label: string, count?: number | null, icon?: boolean) => {
    const active = view === id;
    return (
      <button
        key={id}
        onClick={() => go(id)}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[15px] transition-colors ${
          active ? 'bg-gold-primary/15 font-bold text-gold-light' : 'text-white/80 hover:bg-white/[0.05]'
        }`}
      >
        <span className="flex items-center gap-2">{icon && <LayoutDashboard className="h-4 w-4" aria-hidden />}{label}</span>
        {typeof count === 'number' && <span className="text-sm tabular-nums text-text-secondary">{count}</span>}
      </button>
    );
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg" />
          <p className="font-display text-lg font-extrabold italic">RIBER <span className="text-gold-primary">GO</span> <span className="ml-1 hidden font-sans text-sm font-semibold not-italic text-text-secondary sm:inline">Panel de administración</span></p>
        </div>
        <button onClick={logout} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-sm font-semibold text-text-secondary hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden /> Salir
        </button>
      </header>

      {/* Navegación en teléfono: tira horizontal */}
      <nav aria-label="Secciones" className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-2.5 md:hidden">
        {[{ id: 'overview', label: 'Resumen' }, ...ADMIN_COLLECTIONS].map((c) => (
          <button
            key={c.id}
            onClick={() => go(c.id)}
            aria-current={view === c.id ? 'page' : undefined}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${view === c.id ? 'bg-gold-primary text-background' : 'border border-white/10 text-white/80'}`}
          >
            {c.label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Secciones" className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/10 px-3 py-5 md:block">
          {navBtn('overview', 'Resumen', undefined, true)}
          {groups.map((g) => (
            <div key={g.id} className="mt-6">
              <p className="px-3 pb-1.5 text-xs font-semibold text-text-secondary">{GROUP_LABELS[g.id]}</p>
              {g.items.map((c) => navBtn(c.id, c.label, counts[c.id]))}
            </div>
          ))}
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {current ? (
            <CollectionView key={current.id} cfg={current} names={names} onUnauthorized={loggedOut} />
          ) : (
            <Overview names={names} onOpen={go} onUnauthorized={loggedOut} />
          )}
        </main>
      </div>
    </div>
  );
}
