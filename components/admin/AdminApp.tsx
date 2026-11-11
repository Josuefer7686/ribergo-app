'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eraser, LayoutDashboard, LogOut } from 'lucide-react';
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

  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);

  const cleanup = async () => {
    setCleaning(true);
    setConfirmClean(false);
    try {
      const r = await fetch('/api/admin/cleanup', { method: 'POST' });
      const j = await r.json();
      if (r.status === 401) return loggedOut();
      if (!j.ok) throw new Error(j.error || 'Error');
      const { offlineDrivers: a, abandonedRides: b, closedRequests: c } = j.result;
      setCleanMsg(
        a + b + c === 0
          ? 'Todo estaba en orden: no había nada que limpiar.'
          : `Listo: ${a} conductor(es) desconectado(s), ${b} pedido(s) abandonado(s) cerrado(s) y ${c} copia(s) vieja(s) quitada(s).`
      );
    } catch {
      setCleanMsg('No se pudo limpiar. Intenta de nuevo.');
    } finally {
      setCleaning(false);
      setTimeout(() => setCleanMsg(null), 8000);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmClean(true)}
            disabled={cleaning}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-sm font-semibold text-text-secondary hover:text-white disabled:opacity-50"
          >
            <Eraser className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">{cleaning ? 'Limpiando…' : 'Limpiar datos viejos'}</span>
          </button>
          <button onClick={logout} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-sm font-semibold text-text-secondary hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden /> Salir
          </button>
        </div>
      </header>

      {confirmClean && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-5" role="dialog" aria-modal="true" aria-label="Limpiar datos viejos">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6">
            <h2 className="font-display text-lg font-extrabold">¿Limpiar datos viejos?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
              Desconecta a los conductores que dejaron de dar señal, cancela los pedidos abandonados hace horas y quita las copias de viajes que ya terminaron.
              <strong className="font-semibold text-white"> No borra usuarios, historial, mensajes ni dinero.</strong>
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmClean(false)} className="h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold">Cancelar</button>
              <button onClick={cleanup} className="h-11 rounded-xl bg-gold-primary px-4 text-sm font-black text-background">Limpiar ahora</button>
            </div>
          </div>
        </div>
      )}
      {cleanMsg && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)]">
          {cleanMsg}
        </div>
      )}

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
