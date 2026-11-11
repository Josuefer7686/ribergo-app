'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useDragControls, useMotionValue, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { haptics } from '@/utils/haptics';

interface Props {
  /** Título visible incluso con el panel escondido */
  title: ReactNode;
  children: ReactNode;
  /** Siempre visible al pie del panel (p. ej. el botón principal) */
  footer?: ReactNode;
  /** Se mueve junto con el panel (p. ej. el botón de ubicación) */
  floating?: ReactNode;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const;

/**
 * Panel inferior que sigue al dedo 1:1, se esconde dejando solo el asa y
 * el título, y se puede volver a subir arrastrando o tocando el asa.
 * Solo el asa arrastra: el contenido conserva su propio scroll.
 */
export function BottomSheet({ title, children, footer, floating }: Props) {
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [hiddenOffset, setHiddenOffset] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

  const measure = useCallback(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    if (!sheet || !handle) return;
    setHiddenOffset(Math.max(0, sheet.offsetHeight - handle.offsetHeight));
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Si el contenido cambia de alto estando escondido, mantiene solo el asa visible.
  useEffect(() => {
    if (collapsedRef.current) y.set(hiddenOffset);
  }, [hiddenOffset, y]);

  const snapTo = useCallback(
    (hide: boolean, velocity = 0) => {
      const changed = collapsedRef.current !== hide;
      collapsedRef.current = hide;
      setCollapsed(hide);
      if (changed) (hide ? haptics.sheetClose : haptics.sheetOpen)();
      const target = hide ? hiddenOffset : 0;
      if (reduce) y.set(target);
      else animate(y, target, { ...SPRING, velocity });
    },
    [hiddenOffset, reduce, y],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="relative pointer-events-none"
    >
      <motion.div
        ref={sheetRef}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={{ top: 0, bottom: hiddenOffset }}
        dragElastic={{ top: 0.06, bottom: 0.06 }}
        onDragStart={() => {
          dragged.current = true;
          haptics.selection();
        }}
        onDragEnd={(_, info) => {
          const projected = y.get() + info.velocity.y * 0.18;
          snapTo(projected > hiddenOffset / 2, info.velocity.y);
          setTimeout(() => (dragged.current = false), 0);
        }}
        style={{ y }}
        className="relative pointer-events-auto flex flex-col max-h-[calc(100dvh-14rem)] rounded-[28px] bg-surface border border-white/10 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.8)]"
      >
        {floating && (
          <div className="absolute right-0 -top-[68px] pointer-events-none">{floating}</div>
        )}

        <div
          ref={handleRef}
          onPointerDown={(e) => controls.start(e)}
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing select-none"
        >
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Mostrar panel' : 'Ocultar panel'}
            onClick={() => {
              if (dragged.current) return;
              snapTo(!collapsedRef.current);
            }}
            className="w-full px-4 pt-2.5 pb-3 flex flex-col items-stretch gap-2.5 text-left"
          >
            <span className="mx-auto h-1.5 w-11 rounded-full bg-white/25" aria-hidden />
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1">{title}</span>
              <ChevronDown
                className={`w-5 h-5 text-text-secondary shrink-0 transition-transform duration-200 ease-out ${
                  collapsed ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-4 pb-4 pt-3 border-t border-white/10 space-y-1">{footer}</div>
        )}
      </motion.div>
    </motion.div>
  );
}
