'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  type AdminDoc, fmtDate, money, placeName, roleLabel, serviceLabel, statusInfo, toMs,
} from './format';
import { Chip, type Names, StatusChip } from './ui';

const LABELS: Record<string, string> = {
  name: 'Nombre', phone: 'Teléfono', email: 'Correo', role: 'Rol', avatar: 'Foto',
  rating: 'Calificación', ratingsCount: 'Cantidad de calificaciones', ratingsSum: 'Suma de calificaciones',
  trips: 'Viajes hechos', totalTrips: 'Viajes en total', walletBalance: 'Saldo de la billetera',
  freeTripsRemaining: 'Viajes de regalo que le quedan', vehicleType: 'Tipo de vehículo',
  motorcycle: 'Vehículo', plate: 'Placa', verified: 'Verificado', hasSelectedRole: 'Ya eligió su rol',
  hasCompletedDriverTutorial: 'Terminó el tutorial', accountNumber: 'Número de cuenta',
  createdAt: 'Creado', updatedAt: 'Actualizado', createdAtMs: 'Creado', completedAt: 'Terminó',
  completedAtMs: 'Terminó', acceptedAt: 'Aceptado', acceptedAtMs: 'Aceptado', approvedAtMs: 'Aprobada',
  rejectedAtMs: 'Rechazada', lastActive: 'Última señal', formattedDate: 'Fecha',
  status: 'Estado', serviceType: 'Servicio', pickup: 'Origen', destination: 'Destino', price: 'Precio',
  distanceKm: 'Distancia (km)', durationMin: 'Duración (min)', paymentMethod: 'Forma de pago',
  paymentStatus: 'Estado del pago', passengerId: 'Pasajero (código)', passengerName: 'Pasajero',
  passengerPhone: 'Teléfono del pasajero', driverId: 'Conductor (código)', driverName: 'Conductor',
  driverPhone: 'Teléfono del conductor', driverRating: 'Calificación del conductor',
  amount: 'Monto', currentBalance: 'Saldo al pedir', previousBalance: 'Saldo anterior', newBalance: 'Saldo nuevo',
  vehicle: 'Vehículo', approvedBy: 'Aprobada por (Telegram)', rejectedBy: 'Rechazada por (Telegram)',
  text: 'Mensaje', sender: 'Quién escribió', todayIncome: 'Ganó hoy', totalIncome: 'Ganó en total',
  todayDate: 'Día del conteo', heading: 'Rumbo', speed: 'Velocidad', currentLocation: 'Ubicación',
  route: 'Ruta', date: 'Fecha', time: 'Hora', vehicleModel: 'Modelo', pricePerSeat: 'Precio por asiento',
  occupiedSeats: 'Asientos ocupados', seatNumber: 'Asiento', trackingCode: 'Código de rastreo',
  senderId: 'Remitente (código)', senderName: 'Remitente', senderPhone: 'Teléfono del remitente',
  recipientName: 'Destinatario', recipientPhone: 'Teléfono del destinatario',
  packageDescription: 'Contenido', origin: 'Origen', deliveryAddress: 'Dirección de entrega',
  pickupAddress: 'Recoger en', destinationAddress: 'Llevar a', departureDate: 'Día de salida',
  idNumber: 'Carnet de identidad', fullName: 'Nombre completo', faceDistance: 'Distancia de rostro (menor es mejor)', faceMatch: 'Rostro vs carnet', livenessChallenges: 'Pruebas en vivo', rejectReason: 'Motivo del rechazo', vehicleTypes: 'Vehículos registrados', type: 'Tipo', model: 'Modelo', resolvedAtMs: 'Resuelta',
  reason: 'Motivo', note: 'Comentario', title: 'Tipo', rideId: 'Viaje (código)',
  reporterId: 'Quien reporta (código)', reporterName: 'Quien reporta', reporterPhone: 'Teléfono de quien reporta', reporterRole: 'Rol de quien reporta',
  reportedId: 'Reportado (código)', reportedName: 'Reportado', reportedPhone: 'Teléfono del reportado', reportedRole: 'Rol del reportado',
  reportedPlate: 'Placa del reportado', reportedVehicle: 'Vehículo del reportado', rideStatus: 'Estado del viaje', messageCount: 'Cantidad de mensajes',
  messages: 'Chat completo', lastMessages: 'Últimos mensajes', passengerLocation: 'Ubicación del pasajero', driverVehicle: 'Vehículo', driverPlate: 'Placa',
  departureTime: 'Hora de salida', chatId: 'Chat de Telegram', adminName: 'Administrador',
};

const MONEY_KEYS = new Set(['price', 'amount', 'walletBalance', 'currentBalance', 'previousBalance', 'newBalance', 'todayIncome', 'totalIncome', 'pricePerSeat']);
const PERSON_KEYS = new Set(['passengerId', 'driverId', 'senderId', 'reporterId', 'reportedId']);

function renderValue(key: string, v: any, names: Names): ReactNode {
  if (v === null || v === undefined || v === '') return <span className="text-text-secondary">—</span>;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (key === 'status') return <StatusChip status={v} />;
  if (key === 'role' || key === 'reporterRole' || key === 'reportedRole') return roleLabel(v);
  if ((key === 'messages' || key === 'lastMessages') && Array.isArray(v)) {
    return v.length === 0 ? 'Sin mensajes' : (
      <ol className="space-y-1.5">
        {v.map((m: any, i: number) => (
          <li key={i} className="rounded-lg border border-white/10 bg-background px-3 py-2">
            <span className="text-xs text-text-secondary">{m.sender === 'DRIVER' ? 'Conductor' : 'Pasajero'} · {fmtDate(toMs(m.createdAtMs), true)}</span>
            <p className="whitespace-pre-wrap break-words">{m.text}</p>
          </li>
        ))}
      </ol>
    );
  }
  if (key === 'passengerLocation' && v && typeof v.lat === 'number') {
    return <a className="text-gold-primary underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}>{v.lat.toFixed(5)}, {v.lng.toFixed(5)} · abrir en el mapa</a>;
  }
  if (key === 'serviceType' || key === 'vehicleType') return serviceLabel(v);
  if (key === 'sender') return v === 'DRIVER' ? 'Conductor' : 'Pasajero';
  if (MONEY_KEYS.has(key) && typeof v === 'number') return money(v);
  if (PERSON_KEYS.has(key)) {
    const n = names[String(v)]?.name;
    return (
      <span>
        {n ? <span className="font-semibold">{n} </span> : null}
        <span className="font-mono text-xs text-text-secondary">{String(v)}</span>
      </span>
    );
  }
  const ms = toMs(v);
  if (ms && (typeof v === 'object' || key.endsWith('Ms') || key.endsWith('At'))) return fmtDate(ms, true);
  if (v && typeof v === 'object' && '__geo' in v) return `${v.__geo[0].toFixed(5)}, ${v.__geo[1].toFixed(5)}`;
  if (v && typeof v === 'object' && '__ref' in v) return <span className="font-mono text-xs">{v.__ref}</span>;
  if (key === 'pickup' || key === 'destination') {
    const lat = v?.lat, lng = v?.lng;
    return (
      <span>
        {placeName(v)}
        {typeof lat === 'number' && typeof lng === 'number' && (
          <span className="block text-xs text-text-secondary font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
        )}
      </span>
    );
  }
  if (Array.isArray(v) && v.every((x) => typeof x !== 'object')) return v.length ? v.join(', ') : 'Ninguno';
  if (typeof v === 'object') {
    return <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-secondary">{JSON.stringify(v, null, 2)}</pre>;
  }
  return String(v);
}

const PERSON_IMAGES: [string, string][] = [
  ['liveFrame', 'Rostro en vivo'], ['idFront', 'Carnet (anverso)'], ['idBack', 'Carnet (reverso)'],
];

interface ReviewVehicle { id: string; type: string; model: string; status: string; photo: string }

async function adminAction(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  return fetch('/api/admin/verification', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((x) => x.json()).catch(() => ({ ok: false, error: 'Sin conexión' }));
}

function Photo({ src, label }: { src?: string; label: string }) {
  return (
    <figure className="space-y-1">
      {src ? (
        <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={label} className="aspect-[4/3] w-full rounded-lg border border-white/10 object-cover" /></a>
      ) : <div className="aspect-[4/3] rounded-lg border border-white/10" />}
      <figcaption className="text-xs text-text-secondary">{label}</figcaption>
    </figure>
  );
}

/** Revisión de una persona: fotos, vehículos y las acciones aprobar / rechazar / segunda oportunidad / banear. */
function PersonReview({ id, status }: { id: string; status: string }) {
  const [images, setImages] = useState<Record<string, string> | null>(null);
  const [vehicles, setVehicles] = useState<ReviewVehicle[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState('');
  const [confirm, setConfirm] = useState<'' | 'reset' | 'ban'>('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/verification?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => { if (!alive) return; if (j.ok) { setImages(j.images); setVehicles(j.vehicles || []); } else setError('No se pudieron cargar las fotos.'); })
      .catch(() => alive && setError('No se pudieron cargar las fotos.'));
    return () => { alive = false; };
  }, [id]);

  const act = async (action: 'approve' | 'reject' | 'reset' | 'ban' | 'unban', okText: string) => {
    setBusy(true);
    const r = await adminAction({ id, action, reason });
    setBusy(false);
    setConfirm('');
    setDone(r.ok ? okText : r.error || 'No se pudo guardar. Intenta otra vez.');
  };

  const btn = 'h-10 flex-1 rounded-lg text-sm font-bold disabled:opacity-50';
  return (
    <section className="mb-5 space-y-4 rounded-xl border border-gold-primary/30 bg-background p-4">
      <h3 className="font-display text-base font-extrabold">Revisión del conductor</h3>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!images && !error && <p className="text-sm text-text-secondary">Cargando fotos…</p>}
      {images && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {PERSON_IMAGES.map(([k, label]) => <Photo key={k} src={images[k]} label={label} />)}
          </div>
          {vehicles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Vehículos que registró</p>
              <div className="grid grid-cols-2 gap-3">
                {vehicles.map((v) => <Photo key={v.id} src={v.photo} label={`${serviceLabel(v.type)} · ${v.model} · ${statusInfo(v.status).label}`} />)}
              </div>
              <p className="text-xs text-text-secondary">Al aprobar a la persona se aprueban también los vehículos pendientes.</p>
            </div>
          )}
        </>
      )}
      {done ? (
        <p className="text-sm font-semibold text-emerald-300">{done}</p>
      ) : (
        <div className="space-y-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (lo verá el conductor si rechazas o baneas)" className="h-10 w-full rounded-lg border border-white/10 bg-surface px-3 text-sm" />
          {status === 'BANNED' ? (
            <button disabled={busy} onClick={() => act('unban', 'Baneo quitado: podrá registrarse de nuevo.')} className={`${btn} w-full bg-emerald-500 text-black`}>Quitar baneo</button>
          ) : (
            <>
              <div className="flex gap-2">
                <button disabled={busy || status === 'APPROVED'} onClick={() => act('approve', 'Conductor aprobado.')} className={`${btn} bg-emerald-500 text-black`}>Aprobar</button>
                <button disabled={busy || status === 'REJECTED'} onClick={() => act('reject', 'Solicitud rechazada.')} className={`${btn} bg-rose-500 text-white`}>Rechazar</button>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => setConfirm('reset')} className={`${btn} border border-white/15 text-white`}>Segunda oportunidad (borrar historial)</button>
                <button disabled={busy} onClick={() => setConfirm('ban')} className={`${btn} border border-rose-400/60 text-rose-300`}>Banear</button>
              </div>
            </>
          )}
          {confirm && (
            <div className="rounded-lg border border-white/15 bg-surface p-3 space-y-2 text-sm">
              <p>{confirm === 'reset'
                ? 'Se borran la solicitud, las fotos y los vehículos de este conductor. Podrá registrarse desde cero. ¿Seguro?'
                : 'El conductor queda baneado y no podrá volver a registrarse hasta que le quites el baneo. ¿Seguro?'}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm('')} className={`${btn} border border-white/15`}>Cancelar</button>
                <button onClick={() => act(confirm, confirm === 'reset' ? 'Historial borrado: podrá registrarse de nuevo.' : 'Conductor baneado.')} className={`${btn} bg-rose-500 text-white`}>Sí, continuar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Revisión de un vehículo suelto (cuando un conductor ya verificado agrega otro). */
function VehicleReview({ id, status }: { id: string; status: string }) {
  const [photo, setPhoto] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/verification?kind=vehicle&id=${encodeURIComponent(id)}`).then((r) => r.json()).then((j) => alive && j.ok && setPhoto(j.images.vehicle || '')).catch(() => {});
    return () => { alive = false; };
  }, [id]);
  const act = async (action: 'approve' | 'reject' | 'delete', okText: string) => {
    setBusy(true);
    const r = await adminAction({ kind: 'vehicle', id, action, reason });
    setBusy(false);
    setDone(r.ok ? okText : r.error || 'No se pudo guardar.');
  };
  const btn = 'h-10 flex-1 rounded-lg text-sm font-bold disabled:opacity-50';
  return (
    <section className="mb-5 space-y-4 rounded-xl border border-gold-primary/30 bg-background p-4">
      <h3 className="font-display text-base font-extrabold">Revisión del vehículo</h3>
      <Photo src={photo} label="Foto del vehículo" />
      {done ? <p className="text-sm font-semibold text-emerald-300">{done}</p> : (
        <div className="space-y-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo si lo rechazas (lo verá el conductor)" className="h-10 w-full rounded-lg border border-white/10 bg-surface px-3 text-sm" />
          <div className="flex gap-2">
            <button disabled={busy || status === 'APPROVED'} onClick={() => act('approve', 'Vehículo aprobado.')} className={`${btn} bg-emerald-500 text-black`}>Aprobar</button>
            <button disabled={busy || status === 'REJECTED'} onClick={() => act('reject', 'Vehículo rechazado.')} className={`${btn} bg-rose-500 text-white`}>Rechazar</button>
            <button disabled={busy} onClick={() => act('delete', 'Vehículo borrado: podrá registrarlo de nuevo.')} className={`${btn} border border-white/15`}>Borrar</button>
          </div>
        </div>
      )}
    </section>
  );
}

interface Props {
  doc: AdminDoc;
  title: string;
  names: Names;
  onClose: () => void;
}

export function DocDetail({ doc, title, names, onClose }: Props) {
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Si existe la fecha en dos formatos (createdAt y createdAtMs), se muestra una sola vez.
  const keys = Object.keys(doc.data).filter((k) => !(k.endsWith('Ms') && k.slice(0, -2) in doc.data)).sort((a, b) => {
    const ia = a in LABELS ? 0 : 1, ib = b in LABELS ? 0 : 1;
    return ia - ib || a.localeCompare(b);
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Detalle: ${title}`}>
      <button className="absolute inset-0 bg-black/60" aria-label="Cerrar detalle" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-surface border-l border-white/10 shadow-[-24px_0_48px_-12px_rgba(0,0,0,0.8)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold leading-tight">{title}</h2>
            <p className="mt-1 break-all font-mono text-xs text-text-secondary">{doc.path}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-text-secondary hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-5 py-4">
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => setRaw(false)}
              className={`h-9 rounded-lg px-3 text-sm font-semibold ${!raw ? 'bg-gold-primary text-background' : 'border border-white/10 text-text-secondary'}`}
            >
              Resumen
            </button>
            <button
              onClick={() => setRaw(true)}
              className={`h-9 rounded-lg px-3 text-sm font-semibold ${raw ? 'bg-gold-primary text-background' : 'border border-white/10 text-text-secondary'}`}
            >
              Datos técnicos
            </button>
          </div>

          {doc.path.startsWith('driver_verifications/') && <PersonReview id={doc.id} status={String(doc.data.status)} />}
          {doc.path.startsWith('driver_vehicles/') && <VehicleReview id={doc.id} status={String(doc.data.status)} />}

          {raw ? (
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-background p-4 font-mono text-xs leading-relaxed text-text-secondary">
              {JSON.stringify(doc.data, null, 2)}
            </pre>
          ) : (
            <dl className="divide-y divide-white/10">
              {keys.map((k) => (
                <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 py-2.5 text-sm">
                  <dt className="text-text-secondary">{LABELS[k] ?? <span className="font-mono text-xs">{k}</span>}</dt>
                  <dd className="min-w-0 break-words">{renderValue(k, doc.data[k], names)}</dd>
                </div>
              ))}
              {keys.length === 0 && <p className="py-3 text-sm text-text-secondary">Este documento está vacío.</p>}
            </dl>
          )}
        </div>
      </aside>
    </div>
  );
}

export { Chip };
