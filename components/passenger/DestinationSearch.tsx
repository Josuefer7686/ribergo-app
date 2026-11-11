'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight, Banknote, Bus, GraduationCap, Hotel, Landmark, MapPin, Search,
  ShoppingBasket, Stethoscope, Trees, Trophy, Wrench, X, Handshake, Sparkles,
} from 'lucide-react';
import {
  DESTINATION_IN_PERSON, RIBERALTA_DESTINATIONS,
  type DestinationCategory, type DestinationOption,
} from '@/services/mockData';
import { haptics } from '@/utils/haptics';

/** Quita tildes y mayúsculas conservando la longitud (para poder resaltar). */
const fold = (text: string) =>
  Array.from(text)
    .map((ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().charAt(0) || ch)
    .join('');

const CATEGORY_ICON: Record<DestinationCategory, typeof MapPin> = {
  plaza: Trees,
  salud: Stethoscope,
  mercado: ShoppingBasket,
  transporte: Bus,
  educacion: GraduationCap,
  banco: Banknote,
  hotel: Hotel,
  deporte: Trophy,
  servicio: Wrench,
  otro: Landmark,
};

const POPULAR_IDS = [
  'plaza-armas', 'mercado-central', 'hospital-general',
  'terminal-buses', 'aeropuerto', 'puerto-pila',
];

function score(dest: DestinationOption, q: string): number {
  const name = fold(dest.name);
  if (name.startsWith(q)) return 0;
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  if (name.includes(q)) return 2;
  const aliases = (dest.aliases ?? []).map(fold);
  if (aliases.some((a) => a.startsWith(q))) return 3;
  if (aliases.some((a) => a.includes(q))) return 4;
  if (fold(dest.address).includes(q)) return 5;
  return -1;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = fold(text).indexOf(query);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-gold-primary">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface Props {
  selected: { name?: string; address?: string } | null;
  onSelect: (dest: DestinationOption) => void;
  onClear: () => void;
  onGo: () => void;
}

export function DestinationSearch({ selected, onSelect, onClear, onGo }: Props) {
  const reduce = useReducedMotion();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // El campo muestra el destino elegido; al editar, se limpia y vuelve a buscar.
  const value = selected?.name ?? text;

  const query = selected?.name ? '' : fold(text.trim());

  const results = useMemo<DestinationOption[]>(() => {
    const places = RIBERALTA_DESTINATIONS.filter((d) => d.id !== DESTINATION_IN_PERSON.id);
    if (!query) {
      return POPULAR_IDS.map((id) => places.find((p) => p.id === id)).filter(Boolean) as DestinationOption[];
    }
    return places
      .map((d) => ({ d, s: score(d, query) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s || a.d.name.localeCompare(b.d.name, 'es'))
      .slice(0, 6)
      .map((r) => r.d);
  }, [query]);

  // Última fila siempre disponible: acordar el destino con el conductor.
  const rows = useMemo(() => [...results, DESTINATION_IN_PERSON], [results]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (dest: DestinationOption) => {
    haptics.selection();
    setText('');
    setOpen(false);
    inputRef.current?.blur();
    onSelect(dest);
  };

  const clear = () => {
    haptics.selection();
    setText('');
    onClear();
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + rows.length) % rows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selected) onGo();
      else if (open && rows[active]) choose(rows[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const hasDestination = Boolean(selected?.name);

  return (
    <div ref={rootRef} className="relative pointer-events-auto">
      <div
        className="flex items-stretch gap-2"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
      >
        <label className="flex-1 min-w-0 flex items-center gap-3 h-14 pl-4 pr-2 rounded-2xl bg-surface border border-white/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] focus-within:border-gold-primary/70 transition-colors">
          <MapPin className="w-5 h-5 text-gold-primary shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              if (selected) onClear();
              setText(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={(e) => {
              setOpen(true);
              if (selected) e.currentTarget.select();
            }}
            onKeyDown={onKeyDown}
            placeholder="¿A dónde quieres ir?"
            aria-label="Destino"
            aria-autocomplete="list"
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={hasDestination ? 'go' : 'search'}
            className="flex-1 min-w-0 bg-transparent text-base font-semibold text-white placeholder:text-text-secondary outline-none truncate"
          />
          {(value || hasDestination) && (
            <button
              type="button"
              onClick={clear}
              aria-label="Borrar destino"
              className="w-10 h-10 -mr-1 rounded-xl flex items-center justify-center text-text-secondary active:scale-90 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>

        <button
          type="button"
          onClick={() => {
            if (hasDestination) {
              haptics.impact();
              onGo();
            } else {
              haptics.selection();
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
          aria-label={hasDestination ? 'Ir a este destino' : 'Buscar destino'}
          className="h-14 shrink-0 rounded-2xl bg-gold-primary text-background font-black flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-6px_rgba(255,198,26,0.55)] active:scale-95 transition-[width,transform] duration-200 ease-out overflow-hidden"
          style={{ width: hasDestination ? 92 : 56 }}
        >
          {hasDestination ? (
            <>
              <span className="text-base">Ir</span>
              <ArrowRight className="w-5 h-5 stroke-[2.6]" />
            </>
          ) : (
            <Search className="w-6 h-6 stroke-[2.6]" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && !hasDestination && (
          <motion.div
            key="suggestions"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'top center' }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl bg-surface border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            <p className="px-4 pt-3 pb-1.5 text-xs font-bold text-text-secondary">
              {query ? 'Resultados' : 'Lugares populares'}
            </p>
            <ul id={listId} role="listbox" className="pb-1.5 max-h-[52dvh] overflow-y-auto no-scrollbar">
              {rows.map((dest, i) => {
                const inPerson = dest.id === DESTINATION_IN_PERSON.id;
                const Icon = inPerson ? Handshake : CATEGORY_ICON[dest.category ?? 'otro'];
                const isActive = i === active;
                return (
                  <li
                    key={dest.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <button
                      type="button"
                      onPointerMove={() => setActive(i)}
                      onClick={() => choose(dest)}
                      className={`w-full min-h-14 px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                        isActive ? 'bg-white/[0.06]' : ''
                      } ${inPerson ? 'border-t border-white/10 mt-1' : ''}`}
                    >
                      <span className="w-10 h-10 rounded-xl bg-surface-2 border border-white/10 flex items-center justify-center shrink-0">
                        <Icon className="w-[18px] h-[18px] text-gold-primary" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold text-white truncate">
                          <Highlight text={dest.name} query={query} />
                        </span>
                        <span className="block text-[13px] text-text-secondary truncate">
                          {dest.address}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {query && results.length === 0 && (
              <p className="px-4 pb-3 text-[13px] text-text-secondary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-primary shrink-0" aria-hidden />
                No encontramos «{text.trim()}». Acuérdalo con tu conductor.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
