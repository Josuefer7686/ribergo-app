'use client';

import type { ReactNode } from 'react';
import { type AdminDoc, ACTIVE_RIDE_STATUSES, fmtAgo, fmtDate, money, placeName, recency, rideStatus, roleLabel, serviceLabel, toMs } from './format';
import { type Names, Person, StatusChip } from './ui';
import { useLiveCollection } from './useLiveCollection';

function Row({ n, title, hint, onOpen }: { n: number | string; title: string; hint: string; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-baseline gap-5 border-b border-white/10 px-1 py-4 text-left transition-colors hover:bg-white/[0.03]">
        <span className="w-16 shrink-0 text-right font-display text-4xl font-extrabold leading-none tabular-nums text-gold-primary">{n}</span>
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold">{title}</span>
          <span className="block text-sm text-text-secondary">{hint}</span>
        </span>
      </button>
    </li>
  );
}

function Block({ title, empty, children, count }: { title: string; empty: string; children: ReactNode; count: number }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-2 font-display text-lg font-extrabold">{title}</h2>
      {count === 0 ? <p className="py-4 text-sm text-text-secondary">{empty}</p> : children}
    </section>
  );
}

export function Overview({ names, onOpen, onUnauthorized }: { names: Names; onOpen: (id: string) => void; onUnauthorized: () => void }) {
  const drivers = useLiveCollection('online_drivers', onUnauthorized);
  const rides = useLiveCollection('rides', onUnauthorized);
  const recharges = useLiveCollection('wallet_recharges', onUnauthorized);
  const users = useLiveCollection('users', onUnauthorized);

  const activeRides = rides.docs.filter((d) => ACTIVE_RIDE_STATUSES.includes(rideStatus(d))).sort((a, b) => recency(b) - recency(a));
  const abandoned = rides.docs.filter((d) => rideStatus(d) === 'STALE').length;
  const pending = recharges.docs.filter((d) => d.data.status === 'PENDING').sort((a, b) => recency(b) - recency(a));
  const nDrivers = users.docs.filter((d) => d.data.role === 'DRIVER').length;
  const nPassengers = users.docs.filter((d) => d.data.role === 'PASSENGER').length;
  const newest = [...users.docs].sort((a, b) => recency(b) - recency(a)).slice(0, 6);

  const loading = [drivers, rides, recharges, users].some((l) => l.status === 'connecting' && l.docs.length === 0);

  return (
    <div className="min-w-0">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold">Resumen</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {loading ? 'Cargando lo que está pasando…' : 'Lo que está pasando en RiberGO ahora mismo. Se actualiza solo.'}
        </p>
      </header>

      <ul className="mb-10 max-w-3xl border-t border-white/10">
        <Row n={drivers.docs.length} title={drivers.docs.length === 1 ? 'conductor conectado' : 'conductores conectados'} hint="Aparecen en el mapa de los pasajeros." onOpen={() => onOpen('online_drivers')} />
        <Row n={activeRides.length} title={activeRides.length === 1 ? 'viaje en curso' : 'viajes en curso'} hint={abandoned > 0 ? `Pedidos recientes que no terminan. Hay ${abandoned} más de días anteriores que quedaron sin cerrar.` : 'Pedidos que todavía no terminan ni se cancelan.'} onOpen={() => onOpen('rides')} />
        <Row n={pending.length} title={pending.length === 1 ? 'recarga pendiente' : 'recargas pendientes'} hint="Esperan que las apruebes en Telegram." onOpen={() => onOpen('wallet_recharges')} />
        <Row n={users.docs.length} title={users.docs.length === 1 ? 'usuario registrado' : 'usuarios registrados'} hint={`${nDrivers} conductores y ${nPassengers} pasajeros.`} onOpen={() => onOpen('users')} />
      </ul>

      <div className="grid gap-10 xl:grid-cols-2">
        <Block title="Viajes en curso" empty="Ningún viaje activo en este momento." count={activeRides.length}>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-surface">
            {activeRides.slice(0, 6).map((d: AdminDoc) => (
              <li key={d.path} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusChip status={rideStatus(d)} />
                  <span className="tabular-nums text-text-secondary">{serviceLabel(d.data.serviceType)} · {money(d.data.price)} · {fmtAgo(recency(d))}</span>
                </div>
                <p className="mt-1.5">
                  <Person name={d.data.passengerName} id={d.data.passengerId} names={names} />
                  <span className="text-text-secondary"> con </span>
                  {d.data.driverId || d.data.driverName ? <Person name={d.data.driverName} id={d.data.driverId} names={names} /> : <span className="text-text-secondary">nadie todavía</span>}
                </p>
                <p className="text-text-secondary">{placeName(d.data.pickup)} → {placeName(d.data.destination)}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Recargas pendientes" empty="No hay recargas esperando aprobación." count={pending.length}>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-surface">
            {pending.slice(0, 6).map((d) => (
              <li key={d.path} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><Person name={d.data.driverName} id={d.data.driverId} names={names} /><span className="block text-text-secondary">{fmtAgo(toMs(d.data.createdAtMs))}</span></span>
                <span className="font-display text-lg font-extrabold tabular-nums text-gold-primary">{money(d.data.amount)}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Últimos registrados" empty="Todavía no hay usuarios." count={newest.length}>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-surface">
            {newest.map((d) => (
              <li key={d.path} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><span className="font-semibold">{d.data.name || 'Sin nombre'}</span><span className="block text-text-secondary">{roleLabel(d.data.role)} · {d.data.phone || 'sin teléfono'}</span></span>
                <span className="text-text-secondary tabular-nums">{fmtDate(toMs(d.data.createdAt))}</span>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </div>
  );
}
