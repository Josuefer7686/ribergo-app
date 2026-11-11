'use client';

import type { ReactNode } from 'react';
import {
  type AdminDoc, fmtAgo, fmtDate, isOnlineFresh, money, pick, placeName, rideStatus, roleLabel, serviceLabel, stars, toMs,
} from './format';
import { Chip, type Names, Person, StatusChip } from './ui';

export interface Col {
  label: string;
  render: (d: AdminDoc, names: Names) => ReactNode;
  align?: 'right';
  /** Permite varias líneas (textos largos). Por defecto las celdas no se parten. */
  wrap?: boolean;
}

const dim = (t: ReactNode) => <span className="text-text-secondary">{t}</span>;
const when = (...keys: string[]) => (d: AdminDoc) => fmtDate(toMs(pick(d, ...keys)));
const route = (a: string, b: string) =>
  function RouteCell(d: AdminDoc) {
    return (
      <span>
        {placeName(d.data[a])} <span className="text-text-secondary">→</span> {placeName(d.data[b])}
      </span>
    );
  };

const ridesCols: Col[] = [
  { label: 'Estado', render: (d) => <StatusChip status={rideStatus(d)} /> },
  { label: 'Servicio', render: (d) => serviceLabel(d.data.serviceType) },
  { label: 'Pasajero', render: (d, n) => <Person name={d.data.passengerName} id={d.data.passengerId} names={n} /> },
  { label: 'Conductor', render: (d, n) => (d.data.driverId || d.data.driverName ? <Person name={d.data.driverName} id={d.data.driverId} names={n} /> : dim('Sin asignar')) },
  { label: 'Trayecto', wrap: true, render: route('pickup', 'destination') },
  { label: 'Precio', align: 'right', render: (d) => money(d.data.price) },
  { label: 'Pedido', render: when('createdAtMs', 'createdAt') },
];

export const COLUMNS: Record<string, Col[]> = {
  driver_vehicles: [
    { label: 'Pidió', render: when('createdAtMs') },
    { label: 'Estado', render: (d) => <StatusChip status={d.data.status} /> },
    { label: 'Conductor', render: (d, n) => <span className="font-semibold"><Person name={d.data.driverName} id={d.data.driverId} names={n} /></span> },
    { label: 'Tipo', render: (d) => serviceLabel(d.data.type) },
    { label: 'Modelo', wrap: true, render: (d) => d.data.model || '—' },
  ],
  driver_verifications: [
    { label: 'Pidió', render: when('createdAtMs', 'createdAt') },
    { label: 'Estado', render: (d) => <StatusChip status={d.data.status} /> },
    { label: 'Nombre completo', render: (d) => <span className="font-semibold">{d.data.fullName || '—'}</span> },
    { label: 'Carnet', render: (d) => <span className="font-mono">{d.data.idNumber || '—'}</span> },
    { label: 'Vehículos', render: (d) => (Array.isArray(d.data.vehicleTypes) ? d.data.vehicleTypes.map(serviceLabel).join(', ') : '—') },
    { label: 'Rostro vs carnet', render: (d) => <Chip tone={d.data.faceMatch === 'OK' ? 'good' : 'warn'}>{d.data.faceMatch === 'OK' ? 'Coincide' : 'Revisar a mano'}{typeof d.data.faceDistance === 'number' ? ` · ${d.data.faceDistance}` : ''}</Chip> },
  ],
  sos_alerts: [
    { label: 'Cuándo', render: when('createdAtMs', 'createdAt') },
    { label: 'Estado', render: () => <Chip tone="bad">SOS</Chip> },
    { label: 'Pasajero', render: (d, n) => <span className="font-semibold"><Person name={d.data.passengerName} id={d.data.passengerId} names={n} /></span> },
    { label: 'Teléfono', render: (d) => d.data.passengerPhone || '—' },
    { label: 'Conductor', render: (d, n) => <Person name={d.data.driverName} id={d.data.driverId} names={n} /> },
    { label: 'Vehículo', render: (d) => [d.data.driverVehicle, d.data.driverPlate].filter(Boolean).join(' · ') || '—' },
    { label: 'Destino', wrap: true, render: (d) => placeName(d.data.destination) },
  ],
  chat_reports: [
    { label: 'Cuándo', render: when('createdAtMs', 'createdAt') },
    { label: 'Motivo', render: (d) => <Chip tone="warn">{d.data.reason || 'Observación'}</Chip> },
    { label: 'Reportado', render: (d) => <span className="font-semibold">{d.data.reportedName || '—'} <span className="font-normal text-text-secondary">({roleLabel(d.data.reportedRole)})</span></span> },
    { label: 'Teléfono', render: (d) => d.data.reportedPhone || '—' },
    { label: 'Lo reportó', render: (d) => d.data.reporterName || '—' },
    { label: 'Mensajes', align: 'right', render: (d) => d.data.messageCount ?? 0 },
  ],
  users: [
    { label: 'Nombre', render: (d) => <span className="font-semibold">{d.data.name || 'Sin nombre'}</span> },
    { label: 'Rol', render: (d) => <Chip tone={d.data.role === 'DRIVER' ? 'warn' : 'info'}>{roleLabel(d.data.role)}</Chip> },
    { label: 'Teléfono', render: (d) => d.data.phone || '—' },
    { label: 'Calificación', render: (d) => stars(d.data.rating, d.data.ratingsCount) },
    { label: 'Viajes', align: 'right', render: (d) => d.data.trips ?? 0 },
    { label: 'Saldo', align: 'right', render: (d) => (d.data.role === 'DRIVER' ? money(d.data.walletBalance ?? 0) : dim('—')) },
    { label: 'Se registró', render: when('createdAt') },
  ],
  online_drivers: [
    { label: 'Conductor', render: (d, n) => <span className="font-semibold"><Person name={d.data.name} id={d.id} names={n} /></span> },
    { label: 'Vehículo', render: (d) => [serviceLabel(d.data.vehicleType), d.data.motorcycle].filter((x) => x && x !== '—').join(' · ') || '—' },
    { label: 'Placa', render: (d) => <span className="font-mono">{d.data.plate || '—'}</span> },
    { label: 'Calificación', render: (d) => stars(d.data.rating) },
    {
      label: 'Última señal',
      render: (d) => (
        <span className="inline-flex items-center gap-2">
          {fmtAgo(toMs(d.data.lastActive))}
          {isOnlineFresh(d) ? <Chip tone="good">Conectado</Chip> : <Chip tone="neutral">Sin señal</Chip>}
        </span>
      ),
    },
  ],
  driver_boxes: [
    { label: 'Conductor', render: (d, n) => <span className="font-semibold"><Person id={d.id} names={n} /></span> },
    { label: 'Ganó hoy', align: 'right', render: (d) => money(d.data.todayIncome ?? 0) },
    { label: 'Ganó en total', align: 'right', render: (d) => money(d.data.totalIncome ?? 0) },
    { label: 'Viajes', align: 'right', render: (d) => d.data.totalTrips ?? 0 },
    { label: 'Calificación', render: (d) => stars(d.data.rating, d.data.ratingsCount) },
    { label: 'Actualizado', render: when('updatedAt') },
  ],
  rides: ridesCols,
  active_requests: ridesCols,
  trips_history: [
    { label: 'Fecha', render: when('completedAtMs', 'completedAt', 'createdAtMs') },
    { label: 'Estado', render: (d) => <StatusChip status={d.data.status} /> },
    { label: 'Pasajero', render: (d, n) => <Person name={d.data.passengerName} id={d.data.passengerId} names={n} /> },
    { label: 'Conductor', render: (d, n) => <Person name={d.data.driverName} id={d.data.driverId} names={n} /> },
    { label: 'Trayecto', wrap: true, render: route('pickup', 'destination') },
    { label: 'Precio', align: 'right', render: (d) => money(d.data.price) },
  ],
  messages: [
    { label: 'Hora', render: when('createdAtMs', 'createdAt') },
    { label: 'Quién', render: (d) => <Chip tone={d.data.sender === 'DRIVER' ? 'warn' : 'info'}>{d.data.sender === 'DRIVER' ? 'Conductor' : 'Pasajero'}</Chip> },
    { label: 'Mensaje', wrap: true, render: (d) => <span className="whitespace-normal break-words">{d.data.text || '—'}</span> },
    { label: 'Viaje', render: (d) => <span className="font-mono text-xs text-text-secondary">{d.path.split('/')[1]?.slice(0, 14) ?? '—'}</span> },
  ],
  wallet_recharges: [
    // Las recargas viejas guardadas por la app (antes del bot) quedaron como COMPLETED.
    { label: 'Estado', render: (d) => (d.data.status === 'COMPLETED' ? <Chip tone="good">Acreditada (método antiguo)</Chip> : <StatusChip status={d.data.status} />) },
    { label: 'Conductor', render: (d, n) => <Person name={d.data.driverName} id={d.data.driverId} names={n} /> },
    { label: 'Monto', align: 'right', render: (d) => <span className="font-semibold">{money(d.data.amount)}</span> },
    { label: 'Saldo al pedir', align: 'right', render: (d) => money(d.data.currentBalance ?? d.data.previousBalance) },
    { label: 'Pidió', render: when('createdAtMs', 'createdAt') },
    { label: 'Se resolvió', render: when('approvedAtMs', 'rejectedAtMs') },
  ],
  terminal_departures: [
    { label: 'Ruta', render: (d) => <span className="font-semibold">{d.data.route || '—'}</span> },
    { label: 'Sale', render: (d) => [d.data.date, d.data.time].filter(Boolean).join(' · ') || '—' },
    { label: 'Vehículo', render: (d) => [d.data.vehicleModel, d.data.plate].filter(Boolean).join(' · ') || '—' },
    { label: 'Chofer', render: (d) => d.data.driverName || '—' },
    { label: 'Por asiento', align: 'right', render: (d) => money(d.data.pricePerSeat) },
    { label: 'Ocupados', align: 'right', render: (d) => (Array.isArray(d.data.occupiedSeats) ? d.data.occupiedSeats.length : 0) },
  ],
  terminal_bookings: [
    { label: 'Pasajero', render: (d, n) => <Person name={d.data.passengerName} id={d.data.passengerId} names={n} /> },
    { label: 'Ruta', render: (d) => d.data.route || '—' },
    { label: 'Sale', render: (d) => [d.data.date, d.data.time].filter(Boolean).join(' · ') || '—' },
    { label: 'Asiento', align: 'right', render: (d) => d.data.seatNumber ?? '—' },
    { label: 'Precio', align: 'right', render: (d) => money(d.data.price) },
    { label: 'Estado', render: (d) => <StatusChip status={d.data.status} /> },
  ],
  terminal_expresos: [
    { label: 'Pasajero', render: (d, n) => <Person name={d.data.passengerName} id={d.data.passengerId} names={n} /> },
    { label: 'Trayecto', wrap: true, render: (d) => (<span>{d.data.pickupAddress || '—'} <span className="text-text-secondary">→</span> {d.data.destinationAddress || '—'}</span>) },
    { label: 'Salida', render: (d) => [d.data.departureDate, d.data.departureTime].filter(Boolean).join(' · ') || '—' },
    { label: 'Precio', align: 'right', render: (d) => money(d.data.price) },
    { label: 'Estado', render: (d) => <StatusChip status={d.data.status} /> },
  ],
  terminal_encomiendas: [
    { label: 'Código', render: (d) => <span className="font-mono font-semibold">{d.data.trackingCode || d.id}</span> },
    { label: 'Envía', render: (d, n) => <Person name={d.data.senderName} id={d.data.senderId} names={n} /> },
    { label: 'Recibe', render: (d) => d.data.recipientName || '—' },
    { label: 'Trayecto', wrap: true, render: (d) => (<span>{d.data.origin || '—'} <span className="text-text-secondary">→</span> {d.data.destination || '—'}</span>) },
    { label: 'Precio', align: 'right', render: (d) => money(d.data.price) },
    { label: 'Estado', render: (d) => <StatusChip status={d.data.status} /> },
  ],
  system_config: [
    { label: 'Nombre', render: (d) => <span className="font-mono font-semibold">{d.id}</span> },
    { label: 'Contenido', wrap: true, render: (d) => dim(Object.keys(d.data).join(', ') || 'Vacío') },
    { label: 'Actualizado', render: when('updatedAtMs', 'updatedAt') },
  ],
};

export const fallbackColumns: Col[] = [
  { label: 'Código', render: (d) => <span className="font-mono text-xs">{d.id}</span> },
  { label: 'Campos', wrap: true, render: (d) => dim(Object.keys(d.data).join(', ')) },
];
