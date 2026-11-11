'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ChevronLeft, Gift, HandCoins, QrCode, ShieldCheck, Siren, Ticket, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDES = ['gift', 'offer', 'commission', 'recharge', 'safe'] as const;
type Slide = (typeof SLIDES)[number];

/** Número que sube o baja con animación suave. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) { from.current = value; return; }
    const controls = animate(from.current, value, { duration: 0.45, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => setShown(Math.round(v)) });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return <span className={`tabular-nums ${className ?? ''}`}>{reduce ? value : shown}</span>;
}

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-surface-2 border border-white/10 p-4 ${className}`}>{children}</div>
);

function GiftSlide() {
  return (
    <div className="space-y-6 text-center">
      <div className="relative mx-auto w-28 h-28">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.8], x: Math.cos((i / 6) * Math.PI * 2) * 74, y: Math.sin((i / 6) * Math.PI * 2) * 74 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 1.1, repeat: Infinity, repeatDelay: 1.4 }}
            className="absolute left-1/2 top-1/2 -ml-2 -mt-2 w-4 h-4 rounded-full bg-gold-primary"
          />
        ))}
        <motion.div
          initial={{ scale: 0.4, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 14 }}
          className="relative w-28 h-28 rounded-[32px] bg-gold-primary text-background flex items-center justify-center shadow-[0_16px_40px_-10px_rgba(255,198,26,0.7)]"
        >
          <Gift className="w-14 h-14" />
        </motion.div>
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-extrabold leading-tight">¡Bienvenido a RiberGO!</h2>
        <p className="text-base text-text-secondary leading-relaxed">Para empezar con fuerza te regalamos <strong className="text-white">5 viajes sin comisión</strong>. Lo que cobres es todo tuyo.</p>
      </div>
      <div className="flex justify-center gap-2" aria-label="5 viajes de regalo">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 16, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4 + n * 0.12, type: 'spring', stiffness: 300, damping: 16 }}
            className="w-12 h-16 rounded-xl bg-gold-primary/15 border-2 border-gold-primary/60 text-gold-primary flex flex-col items-center justify-center"
          >
            <Ticket className="w-5 h-5" />
            <span className="text-sm font-black">{n}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function OfferSlide() {
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl font-extrabold leading-tight">El pasajero pone el precio</h2>
        <p className="text-base text-text-secondary leading-relaxed">Ves la oferta en vivo y la aceptas con un toque. Sin regateos. Prueba el botón:</p>
      </div>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary">Nuevo pedido · Mototaxi</p>
            <p className="font-bold">Plaza Principal → Mercado</p>
          </div>
          <p className="font-display text-2xl font-extrabold text-gold-primary">10 Bs</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {accepted ? (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-emerald-300 font-bold flex items-center gap-2">
              <Check className="w-5 h-5 stroke-[3]" />¡Aceptado! Ahora vas en camino al pasajero.
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { haptics.success(); setAccepted(true); }}
              className="w-full min-h-12 rounded-2xl bg-gold-primary text-background font-black"
            >
              ACEPTAR POR 10 BS
            </motion.button>
          )}
        </AnimatePresence>
      </Card>
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <HandCoins className="w-8 h-8 text-gold-primary shrink-0" />
        <p>Te paga en <strong className="text-white">efectivo</strong> o por QR, directo a ti, al terminar el viaje.</p>
      </div>
    </div>
  );
}

function CommissionSlide() {
  const [trips, setTrips] = useState(8);
  const fare = 10;
  const commission = Math.max(0, trips - 5);
  const gross = trips * fare;
  const net = gross - commission;
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl font-extrabold leading-tight">Comisión justa: solo 1 Bs</h2>
        <p className="text-base text-text-secondary leading-relaxed">Después de tus 5 viajes de regalo, la app descuenta <strong className="text-white">1 Bs por viaje</strong> de tu saldo. Sin mensualidades. Mueve la barra para calcular:</p>
      </div>
      <Card className="space-y-4">
        <div className="flex items-baseline justify-between">
          <label htmlFor="trips" className="text-sm font-semibold">Viajes de 10 Bs</label>
          <span className="font-display text-2xl font-extrabold text-gold-primary"><CountUp value={trips} /></span>
        </div>
        <input
          id="trips"
          type="range"
          min={1}
          max={30}
          value={trips}
          onChange={(e) => { setTrips(Number(e.target.value)); haptics.selection(); }}
          className="w-full accent-[#FFC61A] h-8"
          aria-valuetext={`${trips} viajes`}
        />
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-surface p-3">
            <dt className="text-[11px] text-text-secondary">Cobras</dt>
            <dd className="font-display text-xl font-extrabold"><CountUp value={gross} /> Bs</dd>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <dt className="text-[11px] text-text-secondary">Comisión</dt>
            <dd className="font-display text-xl font-extrabold text-rose-300">-<CountUp value={commission} /> Bs</dd>
          </div>
          <div className="rounded-2xl bg-gold-primary/15 border border-gold-primary/40 p-3">
            <dt className="text-[11px] text-gold-light">Te quedas</dt>
            <dd className="font-display text-xl font-extrabold text-gold-primary"><CountUp value={net} /> Bs</dd>
          </div>
        </dl>
        <p className="text-xs text-text-secondary text-center">{trips <= 5 ? 'Todos tus viajes caen dentro del regalo: comisión cero.' : `Los primeros 5 son gratis; se cobra comisión en ${commission}.`}</p>
      </Card>
    </div>
  );
}

function RechargeSlide() {
  const amounts = [10, 20, 50, 100];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % amounts.length), 1600);
    return () => clearInterval(t);
  }, [amounts.length]);
  const steps = ['Elige el monto en Ingresos', 'Paga el QR desde tu banco', 'Sube la foto del comprobante', 'Lo revisamos y se acredita'];
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl font-extrabold leading-tight">Recargar es fácil</h2>
        <p className="text-base text-text-secondary leading-relaxed">Cada <strong className="text-white">1 Bs de saldo = 1 viaje</strong>. Recarga cuando se acabe.</p>
      </div>
      <div className="flex justify-center gap-2" role="group" aria-label="Montos de recarga">
        {amounts.map((a, idx) => (
          <motion.div key={a} animate={{ scale: idx === i ? 1.12 : 1, backgroundColor: idx === i ? '#FFC61A' : 'rgba(255,255,255,0.06)', color: idx === i ? '#05080B' : '#ffffff' }}
            className="min-w-16 rounded-2xl px-3 py-3 text-center font-display font-extrabold">
            {a}<span className="text-xs font-bold"> Bs</span>
          </motion.div>
        ))}
      </div>
      <ol className="space-y-2">
        {steps.map((t, idx) => (
          <motion.li key={t} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }}
            className="flex items-center gap-3 rounded-2xl bg-surface-2 border border-white/10 p-3">
            <span className="w-8 h-8 rounded-full bg-gold-primary text-background font-black flex items-center justify-center shrink-0">{idx + 1}</span>
            <span className="text-sm font-semibold flex-1">{t}</span>
            {idx === 1 && <QrCode className="w-5 h-5 text-gold-primary" />}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function SafeSlide() {
  const items = [
    { icon: <ShieldCheck className="w-6 h-6" />, title: 'Eres un conductor verificado', text: 'El pasajero ve tu nombre, tu rostro y tu vehículo: confía en ti.' },
    { icon: <Siren className="w-6 h-6" />, title: 'Viaja tranquilo', text: 'El pasajero tiene un botón SOS. Si el viaje se desvía, la administración lo ve.' },
    { icon: <Check className="w-6 h-6" />, title: 'Buen trato, buenos ingresos', text: 'Los chats se guardan. Malas palabras o apodos ofensivos se sancionan.' },
  ];
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl font-extrabold leading-tight">¡Listo para trabajar!</h2>
        <p className="text-base text-text-secondary leading-relaxed">Tres cosas que debes saber:</p>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, idx) => (
          <motion.li key={it.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 * idx }}
            className="flex gap-3.5 rounded-2xl bg-surface-2 border border-white/10 p-4">
            <div className="w-11 h-11 rounded-xl bg-gold-primary/15 text-gold-primary flex items-center justify-center shrink-0">{it.icon}</div>
            <div>
              <p className="font-bold">{it.title}</p>
              <p className="text-sm text-text-secondary leading-snug">{it.text}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

const BODY: Record<Slide, () => ReactNode> = {
  gift: () => <GiftSlide />,
  offer: () => <OfferSlide />,
  commission: () => <CommissionSlide />,
  recharge: () => <RechargeSlide />,
  safe: () => <SafeSlide />,
};

export const DriverWalletTutorialModal = ({ isOpen, onClose }: Props) => {
  const { user, loginUser } = useAppStore();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const last = index === SLIDES.length - 1;

  const complete = async () => {
    haptics.success();
    audio.passengerDriverFound();
    if (user?.id) await apiService.setDriverTutorialCompleted(user.id);
    if (user) loginUser({ ...user, hasCompletedDriverTutorial: true });
    setIndex(0);
    onClose();
  };

  const go = (to: number) => {
    haptics.selection();
    setDirection(to > index ? 1 : -1);
    setIndex(to);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Cómo funciona RiberGO para conductores"
          className="fixed inset-0 z-[80] bg-background max-w-[430px] mx-auto flex flex-col text-white"
        >
          <div className="pt-safe px-5 pt-4 pb-2 flex items-center gap-3 shrink-0">
            <div className="flex-1 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={SLIDES.length} aria-valuenow={index + 1}>
              {SLIDES.map((s, i) => (
                <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= index ? 'bg-gold-primary' : 'bg-white/15'}`} />
              ))}
            </div>
            <button onClick={complete} aria-label="Saltar tutorial" className="w-9 h-9 rounded-full bg-surface-2 text-text-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 flex">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={SLIDES[index]}
                custom={direction}
                initial={{ opacity: 0, x: 40 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 * direction }}
                transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                className="w-full my-auto"
              >
                {BODY[SLIDES[index]]()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 flex gap-3">
            {index > 0 && (
              <button onClick={() => go(index - 1)} aria-label="Anterior" className="w-14 min-h-14 rounded-2xl bg-surface-2 border border-white/10 flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></button>
            )}
            <button
              onClick={() => (last ? complete() : go(index + 1))}
              className="flex-1 min-h-14 rounded-2xl bg-gold-primary text-background font-black text-base flex items-center justify-center gap-2 shadow-[0_10px_24px_-8px_rgba(255,198,26,0.55)] active:scale-[0.98] transition"
            >
              {last ? '¡A trabajar!' : 'Siguiente'}
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
