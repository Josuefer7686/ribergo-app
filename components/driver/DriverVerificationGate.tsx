'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, IdCard, Car, ScanFace, ShieldCheck, Clock, RefreshCw, AlertTriangle, UserRound } from 'lucide-react';
import { compressToLimit, loadImage } from '@/lib/imageUtils';
import {
  FACE_MATCH_MAX_DISTANCE, descriptorFromImage, faceDistance, loadFaceApi, runLiveness,
} from '@/lib/faceEngine';
import {
  fetchVerification, submitVerification, verificationEnabled, type VerificationInfo,
} from '@/services/driverVerificationClient';
import { haptics } from '@/utils/haptics';

type Step = 'DATA' | 'VEHICLE' | 'ID_FRONT' | 'ID_BACK' | 'FACE' | 'REVIEW';
const STEPS: Step[] = ['DATA', 'VEHICLE', 'ID_FRONT', 'ID_BACK', 'FACE', 'REVIEW'];
const MAX_FACE_ATTEMPTS = 3;

const primaryBtn =
  'w-full min-h-14 rounded-2xl bg-gold-primary text-background font-black text-base flex items-center justify-center gap-2 shadow-[0_10px_24px_-8px_rgba(255,198,26,0.55)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none';
const inputCls =
  'w-full min-h-14 rounded-2xl bg-surface-2 border border-white/10 px-4 text-base text-white placeholder-text-secondary focus:outline-none focus:border-gold-primary';

/** Muestra la app solo a conductores con identidad verificada. */
export function DriverVerificationGate({ children }: { children: ReactNode }) {
  const enabled = verificationEnabled();
  const [info, setInfo] = useState<VerificationInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetchVerification();
    if (res) { setInfo(res); setFailed(false); } else setFailed(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [enabled, refresh]);

  // Mientras espera la aprobación, consulta cada 15 s
  useEffect(() => {
    if (info?.status !== 'PENDING') return;
    const t = setInterval(() => void refresh(), 15000);
    return () => clearInterval(t);
  }, [info?.status, refresh]);

  if (!enabled || info?.status === 'APPROVED') return <>{children}</>;

  if (failed && !info) {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-gold-primary mx-auto" />
          <h2 className="font-display text-xl font-extrabold">No pudimos comprobar tu verificación</h2>
          <p className="text-sm text-text-secondary">Revisa tu internet e inténtalo de nuevo.</p>
          <button onClick={() => void refresh()} className={primaryBtn}><RefreshCw className="w-5 h-5" />Reintentar</button>
        </div>
      </Screen>
    );
  }
  if (!info) {
    return <Screen><p className="text-center text-text-secondary">Comprobando tu verificación…</p></Screen>;
  }
  if (info.status === 'PENDING') {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gold-primary/15 border-2 border-gold-primary/50 flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-gold-primary" />
          </div>
          <h2 className="font-display text-2xl font-extrabold">Estamos revisando tus datos</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {info.fullName ? `${info.fullName}, ` : ''}recibimos tu carnet, tu vehículo y tu rostro. Cuando la administración los apruebe podrás conectarte y recibir viajes. Esta pantalla se actualiza sola.
          </p>
          <button onClick={() => void refresh()} className="w-full min-h-12 rounded-2xl bg-surface-2 border border-white/10 text-white font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />Revisar ahora
          </button>
        </div>
      </Screen>
    );
  }
  if (info.status === 'REJECTED' && !resubmitting) {
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
  return <Wizard onSent={() => void refresh()} />;
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full min-h-dvh bg-background text-white flex items-center justify-center p-6 pt-safe">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Wizard({ onSent }: { onSent: () => void }) {
  const [step, setStep] = useState<Step>('DATA');
  const [form, setForm] = useState({ fullName: '', idNumber: '', vehicleModel: '' });
  const [photos, setPhotos] = useState<{ vehiclePhoto?: string; idFront?: string; idBack?: string }>({});
  const [idDescriptor, setIdDescriptor] = useState<Float32Array | null>(null);
  const [face, setFace] = useState<{ facePhoto: string; liveFrame: string; distance: number; challenges: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [sending, setSending] = useState(false);

  const index = STEPS.indexOf(step);
  const go = (s: Step) => { setError(''); haptics.selection(); setStep(s); };

  const dataValid =
    form.fullName.trim().split(/\s+/).length >= 2 && form.idNumber.trim().length >= 5 && form.vehicleModel.trim().length >= 3;

  const pickPhoto = async (kind: 'vehiclePhoto' | 'idFront' | 'idBack', file: File) => {
    setBusy(true);
    setError('');
    try {
      const max = kind === 'vehiclePhoto' ? 260_000 : 230_000;
      const url = await compressToLimit(file, kind === 'vehiclePhoto' ? 1100 : 1400, Math.floor(max * 0.9));
      if (kind === 'idFront') {
        const img = await loadImage(url);
        const d = await descriptorFromImage(img);
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

  const send = async () => {
    if (!photos.vehiclePhoto || !photos.idFront || !photos.idBack || !face) return;
    setSending(true);
    setError('');
    const res = await submitVerification({
      ...form,
      fullName: form.fullName.trim(),
      idNumber: form.idNumber.trim(),
      vehicleModel: form.vehicleModel.trim(),
      vehiclePhoto: photos.vehiclePhoto,
      idFront: photos.idFront,
      idBack: photos.idBack,
      facePhoto: face.facePhoto,
      liveFrame: face.liveFrame,
      faceDistance: face.distance,
      livenessPassed: true,
      challenges: face.challenges,
    });
    setSending(false);
    if (res.ok) { haptics.success(); onSent(); } else setError(res.error || 'No se pudo enviar.');
  };

  return (
    <div className="w-full h-full min-h-dvh bg-background text-white flex flex-col">
      <header className="pt-safe px-5 pt-4 pb-3 space-y-3 shrink-0">
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={index + 1} aria-label="Progreso">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= index ? 'bg-gold-primary' : 'bg-white/15'}`} />
          ))}
        </div>
        <p className="text-xs font-bold text-gold-primary uppercase tracking-wider">Verificación de conductor · Paso {index + 1} de {STEPS.length}</p>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="flex-1 overflow-y-auto px-5 pb-6 space-y-5 max-w-md w-full mx-auto"
        >
          {step === 'DATA' && (
            <>
              <Title icon={<ShieldCheck className="w-7 h-7" />} title="Conductores de confianza" text="Para la seguridad de los pasajeros y la tuya, verificamos quién eres. El pasajero verá tu nombre, tu rostro y la foto de tu vehículo cuando aceptes su viaje." />
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Nombre completo</span>
                <input className={inputCls} autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Como figura en tu carnet" maxLength={80} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Número de carnet de identidad</span>
                <input className={inputCls} inputMode="numeric" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} placeholder="Ej. 1234567" maxLength={20} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold">Nombre o modelo de tu vehículo</span>
                <input className={inputCls} value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Ej. Honda Wave 110 roja" maxLength={60} />
              </label>
            </>
          )}

          {step === 'VEHICLE' && (
            <>
              <Title icon={<Car className="w-7 h-7" />} title="Foto de tu vehículo" text="Tómala de lado o de frente, con todo el vehículo a la vista y buena luz. Se la mostraremos al pasajero para que te reconozca." />
              <PhotoCapture label="vehículo" image={photos.vehiclePhoto} busy={busy} onFile={(f) => pickPhoto('vehiclePhoto', f)} icon={<Car className="w-10 h-10" />} />
            </>
          )}

          {step === 'ID_FRONT' && (
            <>
              <Title icon={<IdCard className="w-7 h-7" />} title="Carnet: parte de adelante" text="Pon el carnet sobre una superficie plana, sin reflejos ni dedos tapando. Tu foto del carnet debe verse clara." />
              <PhotoCapture label="anverso del carnet" image={photos.idFront} busy={busy} onFile={(f) => pickPhoto('idFront', f)} icon={<IdCard className="w-10 h-10" />} />
              {busy && <p className="text-center text-sm text-text-secondary">Analizando la foto…</p>}
            </>
          )}

          {step === 'ID_BACK' && (
            <>
              <Title icon={<IdCard className="w-7 h-7" />} title="Carnet: parte de atrás" text="Ahora el reverso del carnet, igual de claro." />
              <PhotoCapture label="reverso del carnet" image={photos.idBack} busy={busy} onFile={(f) => pickPhoto('idBack', f)} icon={<IdCard className="w-10 h-10" />} />
            </>
          )}

          {step === 'FACE' && (
            <FaceStep
              idDescriptor={idDescriptor}
              attempts={attempts}
              face={face}
              onAttempt={() => setAttempts((a) => a + 1)}
              onDone={(r) => { setFace(r); setStep('REVIEW'); }}
              maxAttempts={MAX_FACE_ATTEMPTS}
            />
          )}

          {step === 'REVIEW' && face && (
            <>
              <Title icon={<Check className="w-7 h-7" />} title="Todo listo para enviar" text="Revisa que tus datos y fotos estén bien. La administración los revisará y te avisaremos aquí." />
              <div className="rounded-2xl bg-surface border border-white/10 p-4 space-y-1 text-sm">
                <p className="font-bold text-base">{form.fullName}</p>
                <p className="text-text-secondary">Carnet {form.idNumber}</p>
                <p className="text-text-secondary">{form.vehicleModel}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['Rostro', face.facePhoto], ['Carnet', photos.idFront], ['Vehículo', photos.vehiclePhoto]].map(([label, src]) => (
                  <figure key={label as string} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src as string} alt={label as string} className="aspect-square w-full rounded-xl object-cover border border-white/10" />
                    <figcaption className="text-center text-xs text-text-secondary">{label}</figcaption>
                  </figure>
                ))}
              </div>
              {face.distance > FACE_MATCH_MAX_DISTANCE && (
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
        {step === 'DATA' && <button className={primaryBtn} disabled={!dataValid} onClick={() => go('VEHICLE')}>Continuar</button>}
        {step === 'VEHICLE' && <button className={primaryBtn} disabled={!photos.vehiclePhoto || busy} onClick={() => go('ID_FRONT')}>Continuar</button>}
        {step === 'ID_FRONT' && <button className={primaryBtn} disabled={!photos.idFront || busy} onClick={() => go('ID_BACK')}>Continuar</button>}
        {step === 'ID_BACK' && <button className={primaryBtn} disabled={!photos.idBack || busy} onClick={() => go('FACE')}>Continuar</button>}
        {step === 'REVIEW' && <button className={primaryBtn} disabled={sending} onClick={send}>{sending ? 'Enviando…' : 'Enviar para revisión'}</button>}
        {index > 0 && step !== 'REVIEW' && step !== 'FACE' && (
          <button className="w-full min-h-11 text-sm font-semibold text-text-secondary" onClick={() => go(STEPS[index - 1])}>Atrás</button>
        )}
        {step === 'REVIEW' && (
          <button className="w-full min-h-11 text-sm font-semibold text-text-secondary" onClick={() => { setFace(null); go('FACE'); }}>Repetir la prueba de rostro</button>
        )}
      </footer>
    </div>
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
  idDescriptor, attempts, maxAttempts, face, onAttempt, onDone,
}: {
  idDescriptor: Float32Array | null;
  attempts: number;
  maxAttempts: number;
  face: unknown;
  onAttempt: () => void;
  onDone: (r: { facePhoto: string; liveFrame: string; distance: number; challenges: string[] }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running' | 'checking'>('idle');
  const [prompt, setPrompt] = useState('');
  const [progress, setProgress] = useState({ step: 0, total: 4 });
  const [message, setMessage] = useState('');

  const stopCamera = useCallback(() => {
    stopRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stopCamera, [stopCamera]);
  void face;

  const start = async () => {
    setMessage('');
    stopRef.current = false;
    setPhase('loading');
    try {
      await loadFaceApi();
    } catch {
      setMessage('No se pudo preparar el reconocimiento facial. Revisa tu internet e inténtalo otra vez.');
      setPhase('idle');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
    } catch {
      setMessage('Necesitamos permiso para usar la cámara frontal. Actívalo en los ajustes del navegador.');
      setPhase('idle');
      return;
    }

    setPhase('running');
    const result = await runLiveness(videoRef.current!, (text, step, total) => { setPrompt(text); setProgress({ step, total }); }, () => stopRef.current);
    if (!result.passed || !result.descriptor || !result.frame) {
      stopCamera();
      setMessage(result.reason || 'La prueba no se completó.');
      setPhase('idle');
      return;
    }

    setPhase('checking');
    stopCamera();
    const distance = idDescriptor ? await faceDistance(result.descriptor, idDescriptor) : 1;
    const matched = distance <= FACE_MATCH_MAX_DISTANCE;
    if (!matched && attempts + 1 < maxAttempts) {
      onAttempt();
      setMessage(`Tu rostro no coincide con el carnet (intento ${attempts + 1} de ${maxAttempts}). Busca buena luz, sin gorra ni lentes oscuros, e inténtalo otra vez.`);
      setPhase('idle');
      return;
    }
    if (!matched) onAttempt();
    const [facePhoto, liveFrame] = await Promise.all([
      compressToLimit(result.frame, 520, 150_000),
      compressToLimit(result.frame, 640, 170_000),
    ]);
    haptics.success();
    onDone({ facePhoto, liveFrame, distance, challenges: result.challenges });
  };

  return (
    <>
      <Title icon={<ScanFace className="w-7 h-7" />} title="Tu rostro en vivo" text="Es una prueba en vivo: una foto o un video en otra pantalla no funciona. Te pediremos parpadear y girar la cabeza." />
      <div className="relative w-full aspect-[3/4] max-h-[52dvh] mx-auto rounded-[32px] overflow-hidden bg-surface border-2 border-gold-primary/40">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gold-primary">
            <UserRound className="w-16 h-16 opacity-70" />
          </div>
        )}
        {(phase === 'running' || phase === 'checking') && (
          <>
            <div className="absolute inset-6 rounded-full border-2 border-dashed border-gold-primary/70 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent text-center space-y-2">
              <p className="font-display text-lg font-extrabold text-white" aria-live="assertive">{phase === 'checking' ? 'Comparando con tu carnet…' : prompt}</p>
              <div className="flex gap-1.5 justify-center">
                {Array.from({ length: progress.total }).map((_, i) => (
                  <span key={i} className={`h-1.5 w-8 rounded-full ${i < progress.step ? 'bg-gold-primary' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {message && <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{message}</p>}
      {(phase === 'idle' || phase === 'loading') && (
        <button className={primaryBtn} onClick={start} disabled={phase === 'loading'}>
          <ScanFace className="w-5 h-5" />
          {phase === 'loading' ? 'Preparando…' : message ? 'Intentar de nuevo' : 'Empezar prueba de rostro'}
        </button>
      )}
    </>
  );
}
