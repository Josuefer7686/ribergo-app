'use client';

import type { ReactNode } from 'react';
import type { Tone } from './format';
import { statusInfo } from './format';

export type Names = Record<string, { name: string; role: string }>;

const TONE: Record<Tone, string> = {
  good: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  warn: 'bg-gold-primary/12 text-gold-light border-gold-primary/30',
  bad: 'bg-rose-400/12 text-rose-300 border-rose-400/25',
  info: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  neutral: 'bg-white/5 text-text-secondary border-white/10',
};

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: any }) {
  const s = statusInfo(status);
  return <Chip tone={s.tone}>{s.label}</Chip>;
}

/** Persona por nombre; si no se conoce, muestra el código recortado. */
export function Person({ name, id, names }: { name?: any; id?: any; names: Names }) {
  const resolved = (typeof name === 'string' && name) || (id && names[String(id)]?.name) || null;
  if (resolved) return <span>{resolved}</span>;
  if (id) return <span className="text-text-secondary font-mono text-xs">{String(id).slice(0, 8)}…</span>;
  return <span className="text-text-secondary">—</span>;
}

export function LiveBadge({ status, ago }: { status: 'connecting' | 'live' | 'error'; ago: string }) {
  const map = {
    live: { dot: 'bg-emerald-400', text: `En vivo · ${ago}` },
    connecting: { dot: 'bg-gold-primary animate-pulse', text: 'Conectando…' },
    error: { dot: 'bg-rose-400', text: 'Sin conexión, reintentando…' },
  }[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text-secondary" role="status">
      <span className={`h-2 w-2 rounded-full ${map.dot}`} aria-hidden />
      {map.text}
    </span>
  );
}
