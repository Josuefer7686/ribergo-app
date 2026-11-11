'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, BadgeCheck, Camera, Check, Clock, IdCard, Plus, RefreshCw, ScanFace, ShieldCheck, ShieldX, Sparkles, UserRound, X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { VehicleIcon } from '@/components/ui/VehicleIcon';
import { compressToLimit, loadImage } from '@/lib/imageUtils';
import {
  FACE_MATCH_MAX_DISTANCE, descriptorFromImage, faceDistance, loadFaceApi, runLiveness, type LivenessUi,
} from '@/lib/faceEngine';
import {
  activateVehicle, addVehicles, fetchVerification, submitVerification, verificationEnabled,
  type DriverVehicleInfo, type DriverVehicleType, type VerificationInfo, type VehicleDraft,
} from '@/services/driverVerificationClient';
import { haptics } from '@/utils/haptics';

const MAX_FACE_ATTEMPTS = 3;

export const VEHICLE_OPTIONS: { type: DriverVehicleType; title: string; desc: string; placeholder: string }[] = [
  { type: 'MOTOTAXI', title: 'Mototaxi', desc: 'Moto para llevar pasajeros', placeholder: 'Ej. Honda Wave 110 roja' },
  { type: 'MOTOCAR', title: 'Motocar', desc: 'Trimóvil para carga y pasajeros', placeholder: 'Ej. Kingwong 200cc azul' },
  { type: 'TAXI_AUTO', title: 'Taxi Auto', desc: 'Auto de 4 ruedas', placeholder: 'Ej. Toyota Caldina blanco' },
];
const vehicleTitle = (t: DriverVehicleType) => VEHICLE_OPTIONS.find((o) => o.type === t)!.title;

const primaryBtn =
  'w-full min-h-14 rounded-2xl bg-gold-primary text-background font-black text-base flex items-center justify-center gap-2 shadow-[0_10px_24px_-8px_rgba(255,198,26,0.55)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none';
const inputCls =
  'w-full min-h-14 rounded-2xl bg-surface-2 border border-white/10 px-4 text-base text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary';

/** Muestra la app solo a conductores con identidad y al menos un vehículo aprobados. */
export function DriverVerificationGate({ children }: { children: ReactNode }) {
  const enabled = verificationEnabled();
  const vehicleType = useAppStore((s) => s.user?.vehicleType);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);
  const [info, setInfo] = useState<VerificationInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [activationError, setActivationError] = useState('');
  const activating = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetchVerification();
    if (res) { setInfo(res); setFailed(false); } else setFailed(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [enabled, refresh]);

  const approved = info?.vehicles.filter((v) => v.status === 'APPROVED') ?? [];
  const waiting = info?.status === 'PENDING' || (info?.status === 'APPROVED' && approved.length === 0 && info.vehicles.some((v) => v.status === 'PENDING'));

  // Mientras espera una aprobación, consulta cada 15 s
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => void refresh(), 15000);
    return () => clearInterval(t);
  }, [waiting, refresh]);

  // Con vehículos aprobados, el activo siempre debe ser uno de ellos
  const needsActivation = info?.status === 'APPROVED' && approved.length > 0 && !approved.some((v) => v.type === vehicleType);
  useEffect(() => {
    if (!needsActivation || activating.current) return;
    activating.current = true;
    activateVehicle(approved[0].type).then((res) => {
      activating.current = false;
      if (res.ok && res.vehicleType) updateUserProfile({ vehicleType: res.vehicleType, motorcycle: res.motorcycle });
      else setActivationError(res.error || 'No se pudo activar tu vehículo.');
    });
  }, [needsActivation, approved, updateUserProfile]);

  if (!enabled) return <>{children}</>;

  if (failed && !info) {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-gold-primary mx-auto" />
          <h2 className="font-display text-xl font-extrabold">No pudimos comprobar tu cuenta</h2>
          <p className="text-sm text-text-secondary">Revisa tu internet e inténtalo de nuevo.</p>
          <button onClick={() => void refresh()} className={primaryBtn}><RefreshCw className="w-5 h-5" />Reintentar</button>
        </div>
      </Screen>
    );
  }
  if (!info) return <Screen><p className="text-center text-text-secondary">Comprobando tu cuenta…</p></Screen>;

  if (info.status === 'BANNED') {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <ShieldX className="w-16 h-16 text-rose-400 mx-auto" />
          <h2 className="font-display text-2xl font-extrabold">Cuenta suspendida</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{info.rejectReason || 'La administración suspendió esta cuenta de conductor.'}</p>
          <p className="text-xs text-text-secondary">Si crees que es un error, comunícate con RiberGO.</p>
        </div>
      </Screen>
    );
  }

  if (info.status === 'NONE' || (info.status === 'REJECTED' && resubmitting)) {
    return <Wizard mode="full" takenTypes={[]} onSent={() => void refresh()} />;
  }
  if (info.status === 'REJECTED') {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <AlertTriangle className="w-14 h-14 text-rose-400 mx-auto" />
          <h2 className="font-display text-2xl font-extrabold">No pudimos aprobar tu solicitud</h2>
          <p className="text-sm text-text-secondary">{info.rejectReason || 'Los datos o las fotos no eran claros.'}</p>
          <button onClick={() => setResubmitting(true)} className={primaryBtn}>Volver a enviar mis datos</button>
        </div>
      </Screen>
    );
  }

  if (waiting) {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full border-2 border-gold-primary/40 animate-radar" aria-hidden />
            <div className="relative w-20 h-20 rounded-full bg-gold-primary/15 border-2 border-gold-primary/50 flex items-center justify-center">
              <Clock className="w-10 h-10 text-gold-primary" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-extrabold">Estamos revisando tus datos</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {info.fullName ? `${info.fullName}, ` : ''}recibimos tu información. Cuando la administración la apruebe podrás conectarte y recibir viajes. Esta pantalla se actualiza sola.
          </p>
          <button onClick={() => void refresh()} className="w-full min-h-12 rounded-2xl bg-surface-2 border border-white/10 text-white font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />Revisar ahora
          </button>
        </div>
      </Screen>
    );
  }

  // Identidad aprobada
  if (approved.length > 0) {
    if (needsActivation) {
      return (
        <Screen>
          {activationError ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-rose-300">{activationError}</p>
              <button onClick={() => { setActivationError(''); void refresh(); }} className={primaryBtn}>Reintentar</button>
            </div>
          ) : (
            <p className="text-center text-text-secondary">Preparando tu vehículo…</p>
          )}
        </Screen>
      );
    }
    return <>{children}</>;
  }

  // Identidad aprobada pero sin vehículos aprobados ni pendientes: registrar vehículos (sin carnet ni rostro)
  const rejected = info.vehicles.filter((v) => v.status === 'REJECTED');
  return (
    <Wizard
      mode="vehicles"
      takenTypes={info.vehicles.filter((v) => v.status !== 'REJECTED').map((v) => v.type)}
      notes={rejected.length ? rejected.map((v) => `${vehicleTitle(v.type)}: ${v.rejectReason}`).join(' · ') : undefined}
      onSent={() => void refresh()}
    />
  );
}

/** Registro de vehículos adicionales desde el perfil (solo foto y modelo). */
export function AddVehicleOverlay({ vehicles, onClose, onSent }: { vehicles: DriverVehicleInfo[]; onClose: () => void; onSent: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto">
      <Wizard
        mode="vehicles"
        takenTypes={vehicles.filter((v) => v.status !== 'REJECTED').map((v) => v.type)}
        onSent={onSent}
        onCancel={onClose}
      />
    </div>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full min-h-dvh bg-background text-white flex items-center justify-center p-6 pt-safe">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

/** Borrador del registro: sobrevive a que el teléfono cierre la página mientras se abre la cámara. */
interface Draft {
  stepId: StepId;
  selected: DriverVehicleType[];
  drafts: Partial<Record<DriverVehicleType, { model: string; photo?: string }>>;
  person: { fullName: string; idNumber: string };
  photos: { idFront?: string; idBack?: string };
  idDescriptor: number[] | null;
  face: { facePhoto: string; liveFrame: string; distance: number; challenges: string[] } | null;
  attempts: number;
}
const loadDraft = (key: string): Draft | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

type StepId = 'INTRO' | 'TYPES' | `V:${DriverVehicleType}` | 'PERSON' | 'ID_FRONT' | 'ID_BACK' | 'FACE' | 'REVIEW';

function Wizard({
  mode, takenTypes, notes, onSent, onCancel,
}: {
  mode: 'full' | 'vehicles';
  takenTypes: DriverVehicleType[];
  notes?: string;
  onSent: () => void;
  onCancel?: () => void;
}) {
  const uid = useAppStore((st) => st.user?.id);
  const draftKey = `ribergo-driver-draft:${uid ?? 'anon'}:${mode}`;
  const [saved] = useState<Draft | null>(() => (typeof window === 'undefined' ? null : loadDraft(draftKey)));
  const [selected, setSelected] = useState<DriverVehicleType[]>(saved?.selected ?? []);
  const [drafts, setDrafts] = useState<Draft['drafts']>(saved?.drafts ?? {});
  const [person, setPerson] = useState(saved?.person ?? { fullName: '', idNumber: '' });
  const [photos, setPhotos] = useState<Draft['photos']>(saved?.photos ?? {});
  const [idDescriptor, setIdDescriptor] = useState<Float32Array | null>(saved?.idDescriptor ? new Float32Array(saved.idDescriptor) : null);
  const [face, setFace] = useState<Draft['face']>(saved?.face ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(saved?.attempts ?? 0);
  const [sending, setSending] = useState(false);
  const [stepId, setStepId] = useState<StepId>(saved?.stepId ?? (mode === 'full' ? 'INTRO' : 'TYPES'));

  // Guarda el avance (con un pequeño retraso, las fotos pesan) y evita recargas automáticas mientras tanto
  useEffect(() => {
    const w = window as unknown as { __ribergoBusy?: number };
    w.__ribergoBusy = (w.__ribergoBusy ?? 0) + 1;
    return () => { w.__ribergoBusy = Math.max(0, (w.__ribergoBusy ?? 1) - 1); };
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const draft: Draft = { stepId, selected, drafts, person, photos, idDescriptor: idDescriptor ? Array.from(idDescriptor) : null, face, attempts };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // sin espacio o sin almacenamiento: el registro sigue funcionando, solo no se guarda el avance
      }
    }, 400);
    return () => clearTimeout(t);
  }, [draftKey, stepId, selected, drafts, person, photos, idDescriptor, face, attempts]);

  const ordered = VEHICLE_OPTIONS.map((o) => o.type).filter((t) => selected.includes(t));
  const steps: StepId[] =
    mode === 'full'
      ? ['INTRO', 'TYPES', ...ordered.map((t) => `V:${t}` as const), 'PERSON', 'ID_FRONT', 'ID_BACK', 'FACE', 'REVIEW']
      : ['TYPES', ...ordered.map((t) => `V:${t}` as const), 'REVIEW'];
  const index = Math.max(0, steps.indexOf(stepId)); // si el paso guardado ya no existe, vuelve al primero
  const go = (s: StepId) => { setError(''); haptics.selection(); setStepId(s); };
  const next = () => go(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => (index > 0 ? go(steps[index - 1]) : onCancel?.());

  const toggleType = (t: DriverVehicleType) => {
    haptics.selection();
    setSelected((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const personValid = person.fullName.trim().split(/\s+/).length >= 2 && person.idNumber.trim().length >= 5;
  const vehicleValid = (t: DriverVehicleType) => (drafts[t]?.model?.trim().length ?? 0) >= 3 && !!drafts[t]?.photo;

  const pickVehiclePhoto = async (type: DriverVehicleType, file: File) => {
    setBusy(true);
    setError('');
    try {
      const url = await compressToLimit(file, 1100, 230_000);
      setDrafts((d) => ({ ...d, [type]: { model: d[type]?.model ?? '', photo: url } }));
      haptics.success();
    } catch {
      setError('No pudimos leer la foto. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const pickIdPhoto = async (kind: 'idFront' | 'idBack', file: File) => {
    setBusy(true);
    setError('');
    try {
      const url = await compressToLimit(file, 1400, 205_000);
      if (kind === 'idFront') {
        const d = await descriptorFromImage(await loadImage(url));
        if (!d) {
          setError('No vemos tu rostro en el carnet. Acércate, usa buena luz y evita reflejos.');
          return;
        }
        setIdDescriptor(d);
      }
      setPhotos((p) => ({ ...p, [kind]: url }));
      haptics.success();
    } catch {
      setError('No pudimos leer la foto. Intenta de nuevo con buena conexión.');
    } finally {
      setBusy(false);
    }
  };

  const vehicleDrafts = (): VehicleDraft[] =>
    ordered.map((type) => ({ type, model: drafts[type]!.model.trim(), photo: drafts[type]!.photo! }));

  const send = async () => {
    setSending(true);
    setError('');
    let res: { ok: boolean; error?: string };
    if (mode === 'full') {
      if (!photos.idFront || !photos.idBack || !face) { setSending(false); return; }
      res = await submitVerification({
        fullName: person.fullName.trim(),
        idNumber: person.idNumber.trim(),
        facePhoto: face.facePhoto,
        liveFrame: face.liveFrame,
        idFront: photos.idFront,
        idBack: photos.idBack,
        faceDistance: face.distance,
        livenessPassed: true,
        challenges: face.challenges,
        vehicles: vehicleDrafts(),
      });
    } else {
      res = await addVehicles(vehicleDrafts());
    }
    setSending(false);
    if (res.ok) {
      try { localStorage.removeItem(draftKey); } catch {}
      haptics.success();
      onSent();
    } else setError(res.error || 'No se pudo enviar.');
  };

  const canContinue: Record<string, boolean> = {
    INTRO: true,
    TYPES: selected.length > 0,
    PERSON: personValid,
    ID_FRONT: !!photos.idFront && !busy,
    ID_BACK: !!photos.idBack && !busy,
  };

  return (
    <div className="w-full h-full min-h-dvh bg-background text-white flex flex-col">
      <header className="pt-safe px-5 pt-4 pb-3 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 flex-1" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1} aria-label="Progreso">
            {steps.map((s, i) => (
              <motion.span key={s} layout className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= index ? 'bg-gold-primary' : 'bg-white/15'}`} />
            ))}
          </div>
          {onCancel && (
            <button onClick={onCancel} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-surface-2 text-text-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
          )}
        </div>
        <p className="text-xs font-bold text-gold-primary uppercase tracking-wider">
          {mode === 'full' ? 'Registro de conductor' : 'Registrar vehículo'} · Paso {index + 1} de {steps.length}
        </p>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={stepId}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="flex-1 overflow-y-auto px-5 pb-6 space-y-5 max-w-md w-full mx-auto"
        >
          {stepId === 'INTRO' && <Intro />}

          {stepId === 'TYPES' && (
            <>
              <Title icon={<Sparkles className="w-7 h-7" />} title="¿Con qué vehículos trabajas?" text={mode === 'full'
                ? 'Elige uno, dos o los tres. Cada uno se registra con su foto y modelo. Más adelante podrás agregar otros sin repetir tu carnet.'
                : 'Elige los vehículos que quieres registrar. Solo pedimos foto y modelo de cada uno.'} />
              {notes && <p className="text-xs text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl p-3">Se rechazó antes: {notes}</p>}
              <div className="space-y-3" role="group" aria-label="Vehículos">
                {VEHICLE_OPTIONS.map((o) => {
                  const taken = takenTypes.includes(o.type);
                  const on = selected.includes(o.type);
                  return (
                    <motion.button
                      key={o.type}
                      type="button"
                      disabled={taken}
                      aria-pressed={on}
                      whileTap={{ scale: taken ? 1 : 0.97 }}
                      onClick={() => toggleType(o.type)}
                      className={`relative w-full text-left rounded-3xl border-2 p-4 flex items-center gap-4 transition-colors ${
                        taken ? 'opacity-45 border-white/10 bg-surface' : on ? 'border-gold-primary bg-gold-primary/10' : 'border-white/10 bg-surface'
                      }`}
                    >
                      <motion.div animate={on ? { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.4 }}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${on ? 'bg-gold-primary text-background' : 'bg-surface-2 text-gold-primary'}`}>
                        <VehicleIcon type={o.type} className="w-8 h-8 stroke-[2.2]" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-lg font-extrabold leading-tight">{o.title}</p>
                        <p className="text-sm text-text-secondary">{taken ? 'Ya registrado o en revisión' : o.desc}</p>
                      </div>
                      <motion.span
                        initial={false}
                        animate={on ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
                        className="w-8 h-8 rounded-full bg-gold-primary text-background flex items-center justify-center shrink-0"
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                      </motion.span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-center text-sm font-semibold text-gold-primary" aria-live="polite">
                {selected.length === 0 ? 'Toca uno o más' : selected.length === 1 ? '1 vehículo elegido' : `${selected.length} vehículos elegidos`}
              </p>
            </>
          )}

          {stepId.startsWith('V:') && (() => {
            const type = stepId.slice(2) as DriverVehicleType;
            const opt = VEHICLE_OPTIONS.find((o) => o.type === type)!;
            const n = ordered.indexOf(type) + 1;
            return (
              <>
                <Title
                  icon={<VehicleIcon type={type} className="w-8 h-8 stroke-[2.2]" />}
                  title={`Tu ${opt.title.toLowerCase()}`}
                  text={`Vehículo ${n} de ${ordered.length}. Escribe cómo se llama y tómale una foto completa con buena luz: se la mostraremos al pasajero para que te reconozca.`}
                />
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Nombre o modelo</span>
                  <input className={inputCls} value={drafts[type]?.model ?? ''} maxLength={60} placeholder={opt.placeholder}
                    onChange={(e) => setDrafts((d) => ({ ...d, [type]: { ...d[type], model: e.target.value } }))} />
                </label>
                <PhotoCapture label={opt.title.toLowerCase()} image={drafts[type]?.photo} busy={busy} onFile={(f) => pickVehiclePhoto(type, f)} icon={<VehicleIcon type={type} className="w-10 h-10" />} />
              </>
            );
          })()}

          {stepId === 'PERSON' && (
            <>
              <Title icon={<UserRound className="w-7 h-7" />} title="Tus datos" text="Escríbelos tal como figuran en tu carnet de identidad." />
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Nombre completo</span>
                <input className={inputCls} autoComplete="name" value={person.fullName} onChange={(e) => setPerson({ ...person, fullName: e.target.value })} placeholder="Nombres y apellidos" maxLength={80} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Número de carnet de identidad</span>
                <input className={inputCls} inputMode="numeric" value={person.idNumber} onChange={(e) => setPerson({ ...person, idNumber: e.target.value })} placeholder="Ej. 1234567" maxLength={20} />
              </label>
            </>
          )}

          {stepId === 'ID_FRONT' && (
            <>
              <Title icon={<IdCard className="w-7 h-7" />} title="Carnet: parte de adelante" text="Ponlo sobre una superficie plana, sin reflejos ni dedos tapando. Tu foto del carnet debe verse clara." />
              <PhotoCapture label="anverso del carnet" image={photos.idFront} busy={busy} onFile={(f) => pickIdPhoto('idFront', f)} icon={<IdCard className="w-10 h-10" />} />
              {busy && <p className="text-center text-sm text-text-secondary">Analizando la foto…</p>}
            </>
          )}

          {stepId === 'ID_BACK' && (
            <>
              <Title icon={<IdCard className="w-7 h-7" />} title="Carnet: parte de atrás" text="Ahora el reverso del carnet, igual de claro." />
              <PhotoCapture label="reverso del carnet" image={photos.idBack} busy={busy} onFile={(f) => pickIdPhoto('idBack', f)} icon={<IdCard className="w-10 h-10" />} />
            </>
          )}

          {stepId === 'FACE' && (
            <FaceStep
              idDescriptor={idDescriptor}
              attempts={attempts}
              onAttempt={() => setAttempts((a) => a + 1)}
              onDone={(r) => { setFace(r); setStepId('REVIEW'); }}
              maxAttempts={MAX_FACE_ATTEMPTS}
            />
          )}

          {stepId === 'REVIEW' && (
            <>
              <Title icon={<BadgeCheck className="w-7 h-7" />} title="Todo listo para enviar" text="Revisa tus datos y fotos. La administración los revisará y te avisaremos aquí." />
              {mode === 'full' && face && (
                <div className="rounded-2xl bg-surface border border-white/10 p-4 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={face.facePhoto} alt="Tu rostro" className="w-16 h-16 rounded-2xl object-cover border-2 border-gold-primary" />
                  <div className="min-w-0">
                    <p className="font-bold text-base break-words">{person.fullName}</p>
                    <p className="text-sm text-text-secondary">Carnet {person.idNumber}</p>
                  </div>
                </div>
              )}
              <ul className="space-y-2">
                {ordered.map((t) => (
                  <li key={t} className="rounded-2xl bg-surface border border-white/10 p-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={drafts[t]?.photo} alt={vehicleTitle(t)} className="w-20 h-14 rounded-xl object-cover border border-white/10" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gold-primary">{vehicleTitle(t)}</p>
                      <p className="text-sm font-semibold break-words">{drafts[t]?.model}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {mode === 'full' && face && face.distance > FACE_MATCH_MAX_DISTANCE && (
                <p className="text-xs text-gold-light bg-gold-primary/10 border border-gold-primary/30 rounded-xl p-3">
                  Tu rostro no coincidió del todo con la foto del carnet, así que la administración lo revisará con más cuidado.
                </p>
              )}
            </>
          )}

          {error && <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{error}</p>}
        </motion.main>
      </AnimatePresence>

      <footer className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 max-w-md w-full mx-auto space-y-2">
        {stepId === 'INTRO' && <button className={primaryBtn} onClick={next}>Empezar</button>}
        {(stepId === 'TYPES' || stepId === 'PERSON' || stepId === 'ID_FRONT' || stepId === 'ID_BACK') && (
          <button className={primaryBtn} disabled={!canContinue[stepId]} onClick={next}>Continuar</button>
        )}
        {stepId.startsWith('V:') && (
          <button className={primaryBtn} disabled={!vehicleValid(stepId.slice(2) as DriverVehicleType) || busy} onClick={next}>Continuar</button>
        )}
        {stepId === 'REVIEW' && <button className={primaryBtn} disabled={sending} onClick={send}>{sending ? 'Enviando…' : 'Enviar para revisión'}</button>}
        {stepId !== 'FACE' && stepId !== 'INTRO' && (index > 0 || onCancel) && (
          <button className="w-full min-h-11 text-sm font-semibold text-text-secondary" onClick={back}>{index > 0 ? 'Atrás' : 'Cancelar'}</button>
        )}
        {stepId === 'FACE' && <button className="w-full min-h-11 text-sm font-semibold text-text-secondary" onClick={back}>Atrás</button>}
        {stepId === 'REVIEW' && mode === 'full' && (
          <button className="w-full min-h-11 text-sm font-semibold text-text-secondary" onClick={() => { setFace(null); go('FACE'); }}>Repetir la prueba de rostro</button>
        )}
      </footer>
    </div>
  );
}

function Intro() {
  const items: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <ScanFace className="w-6 h-6" />, title: 'Tu identidad', text: 'Carnet por ambos lados y una prueba rápida de rostro en vivo.' },
    { icon: <Camera className="w-6 h-6" />, title: 'Tus vehículos', text: 'Foto y modelo de cada moto, motocar o auto con el que trabajes.' },
    { icon: <Clock className="w-6 h-6" />, title: 'Revisión', text: 'La administración aprueba tus datos y ya puedes recibir viajes.' },
  ];
  return (
    <>
      <div className="pt-2 text-center space-y-3">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative w-24 h-24 mx-auto"
        >
          <span className="absolute inset-0 rounded-full border-2 border-gold-primary/40 animate-radar" aria-hidden />
          <div className="relative w-24 h-24 rounded-full bg-gold-primary text-background flex items-center justify-center shadow-[0_12px_32px_-8px_rgba(255,198,26,0.65)]">
            <ShieldCheck className="w-12 h-12" />
          </div>
        </motion.div>
        <h1 className="font-display text-3xl font-extrabold leading-tight">Conductores de confianza</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          Para que pasajeros y conductores viajen tranquilos, verificamos a cada conductor. El pasajero verá tu nombre, tu rostro y la foto de tu vehículo cuando aceptes su viaje.
        </p>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <motion.li
            key={it.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 * (i + 1), duration: 0.3 }}
            className="rounded-2xl bg-surface border border-white/10 p-4 flex gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-gold-primary/15 text-gold-primary flex items-center justify-center shrink-0">{it.icon}</div>
            <div>
              <p className="font-bold">{it.title}</p>
              <p className="text-sm text-text-secondary leading-snug">{it.text}</p>
            </div>
          </motion.li>
        ))}
      </ul>
      <p className="text-center text-xs font-semibold text-gold-light flex items-center justify-center gap-1.5">
        <Plus className="w-3.5 h-3.5" />Te esperan 5 viajes de regalo sin comisión
      </p>
    </>
  );
}

function Title({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="w-14 h-14 rounded-2xl bg-gold-primary/15 border border-gold-primary/40 text-gold-primary flex items-center justify-center">{icon}</div>
      <h1 className="font-display text-2xl font-extrabold leading-tight">{title}</h1>
      <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}

function PhotoCapture({ label, image, busy, onFile, icon }: { label: string; image?: string; busy: boolean; onFile: (f: File) => void; icon: ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        aria-label={image ? `Repetir foto del ${label}` : `Tomar foto del ${label}`}
        className="relative w-full aspect-[4/3] rounded-3xl border-2 border-dashed border-gold-primary/40 bg-surface overflow-hidden flex flex-col items-center justify-center gap-2 text-gold-primary active:scale-[0.99] transition"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`Foto del ${label}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            {icon}
            <span className="text-sm font-bold">{busy ? 'Procesando…' : `Tomar foto del ${label}`}</span>
          </>
        )}
      </button>
      {image && (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="w-full min-h-11 rounded-xl bg-surface-2 border border-white/10 text-sm font-bold flex items-center justify-center gap-2">
          <Camera className="w-4 h-4" />Repetir foto
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function FaceStep({
  idDescriptor, attempts, maxAttempts, onAttempt, onDone,
}: {
  idDescriptor: Float32Array | null;
  attempts: number;
  maxAttempts: number;
  face?: unknown;
  onAttempt: () => void;
  onDone: (r: { facePhoto: string; liveFrame: string; distance: number; challenges: string[] }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'camera' | 'running' | 'checking'>('idle');
  const [ui, setUi] = useState<LivenessUi | null>(null);
  const [message, setMessage] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  const stopCamera = useCallback(() => {
    stopRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const fail = (text: string) => {
    stopCamera();
    setMessage(text);
    setUi(null);
    setPhase('idle');
    setShakeKey((k) => k + 1);
    haptics.error();
  };

  const start = async () => {
    setMessage('');
    stopRef.current = false;
    setPhase('loading');
    setLoadingText('Preparando el reconocimiento facial (la primera vez tarda unos segundos)…');
    try {
      await loadFaceApi();
    } catch {
      return fail('No se pudo preparar el reconocimiento facial. Revisa tu internet e inténtalo otra vez.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return fail('Este navegador no permite usar la cámara. Abre RiberGO en Chrome o Safari.');
    }
    setLoadingText('Abriendo la cámara…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      // espera a que el video tenga imagen real
      const t0 = Date.now();
      while (video.videoWidth === 0 && Date.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 100));
    } catch {
      return fail('Necesitamos permiso para usar la cámara frontal. Actívalo en los ajustes del navegador y vuelve a intentar.');
    }

    setPhase('running');
    let lastCompleted = 0;
    let result;
    try {
      result = await runLiveness(
        videoRef.current!,
        (u) => {
          if (u.completed > lastCompleted) { lastCompleted = u.completed; haptics.success(); }
          setUi(u);
        },
        () => stopRef.current,
      );
    } catch {
      return fail('Ocurrió un problema al analizar tu rostro. Inténtalo de nuevo.');
    }
    if (!result.passed || !result.descriptor || !result.frame) return fail(result.reason || 'La prueba no se completó.');

    setPhase('checking');
    stopCamera();
    const distance = idDescriptor ? await faceDistance(result.descriptor, idDescriptor) : 1;
    const matched = distance <= FACE_MATCH_MAX_DISTANCE;
    if (!matched && attempts + 1 < maxAttempts) {
      onAttempt();
      return fail(`Pasaste la prueba en vivo, pero tu rostro no coincide con el carnet (intento ${attempts + 1} de ${maxAttempts}). Busca buena luz, sin gorra ni lentes, y repítela. Si el carnet salió borroso, vuelve al paso del carnet.`);
    }
    if (!matched) onAttempt();
    const [facePhoto, liveFrame] = await Promise.all([
      compressToLimit(result.frame, 520, 150_000),
      compressToLimit(result.frame, 640, 170_000),
    ]);
    haptics.success();
    onDone({ facePhoto, liveFrame, distance, challenges: result.challenges });
  };

  const active = phase === 'running' || phase === 'checking';
  const tone = phase === 'checking' ? 'good' : ui?.tone ?? 'bad';
  const ring = tone === 'good' ? 'border-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.45)]' : tone === 'warn' ? 'border-amber-400' : 'border-rose-400';

  return (
    <>
      <Title icon={<ScanFace className="w-7 h-7" />} title="Tu rostro en vivo" text="Sigue las instrucciones en pantalla. Una foto o un video en otra pantalla no funciona." />

      {phase === 'idle' && (
        <ul className="rounded-2xl bg-surface border border-white/10 p-4 space-y-2 text-sm text-text-secondary">
          <li className="flex gap-2"><Check className="w-4 h-4 text-gold-primary shrink-0 mt-0.5" />Ponte en un lugar con buena luz, de frente a la luz.</li>
          <li className="flex gap-2"><Check className="w-4 h-4 text-gold-primary shrink-0 mt-0.5" />Sin gorra, sin lentes oscuros ni nada tapando tu cara.</li>
          <li className="flex gap-2"><Check className="w-4 h-4 text-gold-primary shrink-0 mt-0.5" />Sostén el celular a la altura de tus ojos, con tu cara dentro del óvalo.</li>
          <li className="flex gap-2"><Check className="w-4 h-4 text-gold-primary shrink-0 mt-0.5" />Te pediremos girar la cabeza a un lado y luego al otro, despacio.</li>
        </ul>
      )}

      <motion.div
        key={shakeKey}
        animate={shakeKey ? { x: [0, -10, 10, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`relative w-full aspect-[3/4] max-h-[50dvh] mx-auto rounded-[32px] overflow-hidden bg-surface border-4 transition-colors duration-300 ${active ? ring : 'border-white/10'} ${phase === 'idle' || phase === 'loading' ? 'hidden' : ''}`}
      >
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        {active && (
          <>
            <div className={`absolute left-[12%] right-[12%] top-[10%] bottom-[22%] rounded-[50%] border-[3px] transition-colors duration-300 pointer-events-none ${tone === 'good' ? 'border-emerald-400' : tone === 'warn' ? 'border-amber-400' : 'border-white/60 border-dashed'}`} />
            <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur ${ui?.faceVisible ? 'bg-emerald-500/80 text-black' : 'bg-rose-500/80 text-white'}`}>
                <span className={`w-2 h-2 rounded-full ${ui?.faceVisible ? 'bg-black' : 'bg-white animate-pulse'}`} />
                {ui?.faceVisible ? 'Rostro detectado' : 'Buscando tu rostro…'}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent text-center space-y-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phase === 'checking' ? 'check' : ui?.prompt}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-display text-xl font-extrabold text-white"
                  aria-live="assertive"
                >
                  {phase === 'checking' ? 'Comparando con tu carnet…' : ui?.prompt}
                </motion.p>
              </AnimatePresence>
              <p className="text-xs text-white/80">{phase === 'checking' ? 'Un momento' : ui?.hint}</p>
            </div>
          </>
        )}
      </motion.div>

      {active && ui && (
        <ol className="space-y-2" aria-label="Pasos de la prueba">
          {ui.steps.map((st, i) => {
            const done = i < ui.completed || phase === 'checking';
            const current = i === ui.completed && phase === 'running';
            return (
              <li key={st.id + i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${done ? 'bg-emerald-500/10 border-emerald-500/40' : current ? 'bg-gold-primary/10 border-gold-primary/50' : 'bg-surface border-white/10'}`}>
                <motion.span
                  initial={false}
                  animate={done ? { scale: [0.6, 1.25, 1] } : { scale: 1 }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${done ? 'bg-emerald-400 text-black' : current ? 'bg-gold-primary text-background animate-pulse' : 'bg-white/10 text-text-secondary'}`}
                >
                  {done ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                </motion.span>
                <span className={`text-sm font-semibold ${done ? 'text-emerald-300' : current ? 'text-white' : 'text-text-secondary'}`}>{st.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {phase === 'loading' && (
        <div className="rounded-2xl bg-surface border border-white/10 p-5 text-center space-y-3" aria-live="polite">
          <RefreshCw className="w-7 h-7 text-gold-primary mx-auto animate-spin" />
          <p className="text-sm text-text-secondary">{loadingText}</p>
        </div>
      )}

      {message && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />{message}
        </motion.p>
      )}
      {phase === 'idle' && (
        <button className={primaryBtn} onClick={start}>
          <ScanFace className="w-5 h-5" />
          {message ? 'Intentar de nuevo' : 'Empezar prueba de rostro'}
        </button>
      )}
      {active && phase === 'running' && (
        <button className="w-full min-h-11 text-sm font-semibold text-text-secondary" onClick={() => fail('Cancelaste la prueba.')}>Cancelar</button>
      )}
    </>
  );
}
