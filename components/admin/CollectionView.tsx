'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { AdminCollection } from '@/lib/adminCollections';
import { type AdminDoc, fmtAgo, recency, statusInfo } from './format';
import { COLUMNS, fallbackColumns } from './columns';
import { DocDetail } from './DocDetail';
import { type Names, LiveBadge } from './ui';
import { useLiveCollection } from './useLiveCollection';

const PAGE = 100;

export function CollectionView({ cfg, names, onUnauthorized }: { cfg: AdminCollection; names: Names; onUnauthorized: () => void }) {
  const live = useLiveCollection(cfg.id, onUnauthorized);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<AdminDoc | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const cols = COLUMNS[cfg.id] ?? fallbackColumns;

  const statuses = useMemo(
    () => Array.from(new Set(live.docs.map((d) => d.data.status).filter(Boolean))) as string[],
    [live.docs]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return live.docs
      .filter((d) => (status ? d.data.status === status : true))
      .filter((d) => {
        if (!q) return true;
        const person = [d.data.passengerId, d.data.driverId, d.id].map((id) => names[String(id)]?.name || '').join(' ');
        return (JSON.stringify(d.data) + ' ' + person).toLowerCase().includes(q);
      })
      .sort((a, b) => recency(b) - recency(a));
  }, [live.docs, query, status, names]);

  // El detalle abierto se mantiene al día con los cambios en vivo.
  const openDoc = selected ? live.docs.find((d) => d.path === selected.path) ?? selected : null;
  const shown = rows.slice(0, limit);

  return (
    <section aria-labelledby="coll-title" className="min-w-0">
      <header className="mb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 id="coll-title" className="font-display text-2xl font-extrabold">{cfg.label}</h1>
          <LiveBadge status={live.status} ago={fmtAgo(live.at)} />
        </div>
        <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-text-secondary">{cfg.description}</p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[14rem] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
            placeholder="Buscar por nombre, teléfono, lugar…"
            aria-label="Buscar"
            className="h-11 w-full rounded-xl border border-white/10 bg-surface pl-10 pr-3 text-[15px] placeholder:text-text-secondary outline-none focus:border-gold-primary/70"
          />
        </label>
        {statuses.length > 0 && (
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setLimit(PAGE); }}
            aria-label="Filtrar por estado"
            className="h-11 rounded-xl border border-white/10 bg-surface px-3 text-[15px] outline-none focus:border-gold-primary/70"
          >
            <option value="">Todos los estados</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{statusInfo(s).label}</option>
            ))}
          </select>
        )}
        <p className="ml-auto text-sm text-text-secondary tabular-nums">
          {rows.length === live.docs.length
            ? `${live.docs.length} ${live.docs.length === 1 ? 'registro' : 'registros'}`
            : `${rows.length} de ${live.docs.length}`}
          {live.truncated && ' (mostrando los primeros 500)'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface">
        <table className="w-full min-w-[44rem] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/10 text-xs font-semibold text-text-secondary">
              {cols.map((c) => (
                <th key={c.label} scope="col" className={`whitespace-nowrap px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr
                key={d.path}
                onClick={() => setSelected(d)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(d))}
                tabIndex={0}
                className={`cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04] focus-visible:bg-white/[0.06] ${
                  live.fresh.has(d.path) ? 'bg-gold-primary/10' : ''
                }`}
              >
                {cols.map((c) => (
                  <td key={c.label} className={`px-4 py-3 align-top tabular-nums ${c.wrap ? 'min-w-[12rem]' : 'whitespace-nowrap'} ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.render(d, names)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {live.status === 'connecting' && live.docs.length === 0 && (
          <p className="px-4 py-10 text-center text-text-secondary">Cargando…</p>
        )}
        {live.status === 'live' && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-text-secondary">
            {live.docs.length === 0 ? 'Todavía no hay registros en esta sección.' : 'Nada coincide con tu búsqueda.'}
          </p>
        )}
      </div>

      {rows.length > limit && (
        <button
          onClick={() => setLimit((n) => n + PAGE)}
          className="mt-4 h-11 rounded-xl border border-white/10 px-5 text-sm font-semibold hover:bg-white/[0.04]"
        >
          Mostrar {Math.min(PAGE, rows.length - limit)} más
        </button>
      )}

      {openDoc && <DocDetail doc={openDoc} title={cfg.label} names={names} onClose={() => setSelected(null)} />}
    </section>
  );
}
