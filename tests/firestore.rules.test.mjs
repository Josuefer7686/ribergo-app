import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'ribergo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  // Datos base creados saltando las reglas (como haría el servidor)
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/driver1'), { role: 'DRIVER', hasSelectedRole: true, walletBalance: 20, freeTripsRemaining: 3, rating: 5, ratingsCount: 1, trips: 1, verified: true });
    await setDoc(doc(db, 'users/pax1'), { role: 'PASSENGER', hasSelectedRole: false });
    await setDoc(doc(db, 'rides/r1'), { passengerId: 'pax1', status: 'SEARCHING_DRIVER', price: 10 });
    await setDoc(doc(db, 'active_requests/r2'), { passengerId: 'pax1', driverId: 'driver1', status: 'TRIP_STARTED' });
    await setDoc(doc(db, 'rides/r2'), { passengerId: 'pax1', driverId: 'driver1', status: 'NEGOTIATING', price: 10 });
    await setDoc(doc(db, 'wallet_recharges/rec-1'), { driverId: 'driver1', amount: 20, status: 'PENDING' });
    await setDoc(doc(db, 'system_config/telegram_admin'), { chatId: '1' });
    await setDoc(doc(db, 'driver_boxes/driver1'), { totalIncome: 100, rating: 5, ratingsCount: 1, ratingsSum: 5 });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

test('sin sesión no se lee ni escribe nada', async () => {
  await assertFails(getDoc(doc(anon(), 'users/driver1')));
  await assertFails(setDoc(doc(anon(), 'users/x'), { role: 'PASSENGER' }));
  await assertFails(getDoc(doc(anon(), 'rides/r1')));
});

test('DINERO: nadie puede subir su propio saldo', async () => {
  await assertFails(updateDoc(doc(as('driver1'), 'users/driver1'), { walletBalance: 9999 }));
  await assertFails(setDoc(doc(as('driver1'), 'users/driver1'), { walletBalance: 21 }, { merge: true }));
});
test('DINERO: el conductor sí puede bajar su saldo (comisión)', async () => {
  await assertSucceeds(updateDoc(doc(as('driver1'), 'users/driver1'), { walletBalance: 19 }));
});
test('DINERO: nadie edita el saldo de otro', async () => {
  await assertFails(updateDoc(doc(as('pax1'), 'users/driver1'), { walletBalance: 1 }));
  await assertFails(updateDoc(doc(as('pax1'), 'users/driver1'), { walletBalance: 9999 }));
});
test('DINERO: no se puede crear un perfil con saldo', async () => {
  await assertFails(setDoc(doc(as('new1'), 'users/new1'), { role: 'DRIVER', walletBalance: 500 }));
  await assertSucceeds(setDoc(doc(as('new1'), 'users/new1'), { role: 'DRIVER', freeTripsRemaining: 5 }));
  await assertFails(setDoc(doc(as('new2'), 'users/new2'), { role: 'DRIVER', freeTripsRemaining: 500 }));
});
test('DINERO: los viajes de regalo solo bajan', async () => {
  await assertFails(updateDoc(doc(as('driver1'), 'users/driver1'), { freeTripsRemaining: 5 }));
  await assertSucceeds(updateDoc(doc(as('driver1'), 'users/driver1'), { freeTripsRemaining: 2 }));
});
test('DINERO: las recargas solo las maneja el servidor', async () => {
  await assertFails(updateDoc(doc(as('driver1'), 'wallet_recharges/rec-1'), { status: 'APPROVED' }));
  await assertFails(setDoc(doc(as('driver1'), 'wallet_recharges/rec-2'), { driverId: 'driver1', amount: 100, status: 'APPROVED' }));
  await assertFails(deleteDoc(doc(as('driver1'), 'wallet_recharges/rec-1')));
});
test('recargas: el dueño las lee, otros no', async () => {
  await assertSucceeds(getDoc(doc(as('driver1'), 'wallet_recharges/rec-1')));
  await assertFails(getDoc(doc(as('pax1'), 'wallet_recharges/rec-1')));
});
test('system_config es invisible para los clientes', async () => {
  await assertFails(getDoc(doc(as('driver1'), 'system_config/telegram_admin')));
  await assertFails(setDoc(doc(as('driver1'), 'system_config/telegram_admin'), { chatId: 'hacker' }));
});

test('perfil: solo creas el tuyo', async () => {
  await assertFails(setDoc(doc(as('pax1'), 'users/otro'), { role: 'PASSENGER' }));
  await assertSucceeds(setDoc(doc(as('pax2'), 'users/pax2'), { role: 'PASSENGER' }));
});
test('rol: se elige una sola vez', async () => {
  await assertSucceeds(updateDoc(doc(as('pax1'), 'users/pax1'), { role: 'DRIVER', hasSelectedRole: true }));
  await assertFails(updateDoc(doc(as('driver1'), 'users/driver1'), { role: 'PASSENGER' }));
});
test('verified no se autoasigna', async () => {
  await assertFails(updateDoc(doc(as('pax1'), 'users/pax1'), { verified: true }));
});
test('un pasajero puede calificar al conductor, pero nada más', async () => {
  await assertSucceeds(updateDoc(doc(as('pax1'), 'users/driver1'), { rating: 4.5, ratingsCount: 2 }));
  await assertFails(updateDoc(doc(as('pax1'), 'users/driver1'), { plate: 'ROBADA' }));
  await assertFails(updateDoc(doc(as('pax1'), 'users/driver1'), { rating: 1, role: 'PASSENGER' }));
});
test('no se borran perfiles', async () => {
  await assertFails(deleteDoc(doc(as('driver1'), 'users/driver1')));
});

test('casillero: privado, pero el pasajero puede sumar calificación', async () => {
  await assertFails(getDoc(doc(as('pax1'), 'driver_boxes/driver1')));
  await assertSucceeds(getDoc(doc(as('driver1'), 'driver_boxes/driver1')));
  await assertSucceeds(updateDoc(doc(as('pax1'), 'driver_boxes/driver1'), { rating: 4, ratingsCount: 2, ratingsSum: 9 }));
  await assertFails(updateDoc(doc(as('pax1'), 'driver_boxes/driver1'), { totalIncome: 0 }));
});

test('viajes: creas solo a tu nombre', async () => {
  await assertSucceeds(setDoc(doc(as('pax1'), 'rides/r9'), { passengerId: 'pax1', status: 'SEARCHING_DRIVER' }));
  await assertFails(setDoc(doc(as('pax1'), 'rides/r10'), { passengerId: 'otro', status: 'SEARCHING_DRIVER' }));
});
test('viajes: un conductor puede tomar uno libre', async () => {
  await assertSucceeds(updateDoc(doc(as('driver1'), 'rides/r1'), { driverId: 'driver1', status: 'NEGOTIATING' }));
});
test('viajes: oferta en vivo, un conductor la toma y el segundo ya no puede', async () => {
  await assertSucceeds(updateDoc(doc(as('pax1'), 'rides/r1'), { price: 15, proposedPrice: 15, priceOfferedBy: 'PASSENGER' }));
  await assertSucceeds(updateDoc(doc(as('driver1'), 'rides/r1'), { driverId: 'driver1', status: 'GOING_TO_PASSENGER', fareAgreed: true }));
  await assertFails(updateDoc(doc(as('intruso'), 'rides/r1'), { driverId: 'intruso', status: 'GOING_TO_PASSENGER' }));
});
test('viajes: no se puede secuestrar ni cambiar de dueño', async () => {
  await assertFails(updateDoc(doc(as('intruso'), 'rides/r2'), { status: 'CANCELLED' }));
  await assertFails(updateDoc(doc(as('intruso'), 'rides/r2'), { driverId: 'intruso' }));
  await assertFails(updateDoc(doc(as('pax1'), 'rides/r2'), { passengerId: 'otro' }));
  await assertFails(updateDoc(doc(as('driver1'), 'rides/r1'), { driverId: 'otro-conductor' }));
});
test('viajes: pasajero y conductor sí actualizan el suyo', async () => {
  await assertSucceeds(updateDoc(doc(as('pax1'), 'rides/r2'), { price: 12 }));
  await assertSucceeds(updateDoc(doc(as('driver1'), 'rides/r2'), { status: 'TRIP_STARTED' }));
});
test('viajes: solo el pasajero lo borra', async () => {
  await assertFails(deleteDoc(doc(as('driver1'), 'rides/r2')));
  await assertSucceeds(deleteDoc(doc(as('pax1'), 'rides/r2')));
});

test('active_requests: pasajero y conductor del viaje la cierran, un intruso no', async () => {
  await assertFails(deleteDoc(doc(as('intruso'), 'active_requests/r2')));
  await assertSucceeds(deleteDoc(doc(as('driver1'), 'active_requests/r2')));
});

test('chat: solo participantes', async () => {
  await assertSucceeds(setDoc(doc(as('pax1'), 'rides/r2/messages/m1'), { sender: 'PASSENGER', text: 'hola' }));
  await assertSucceeds(setDoc(doc(as('driver1'), 'rides/r2/messages/m2'), { sender: 'DRIVER', text: 'voy' }));
  await assertFails(setDoc(doc(as('intruso'), 'rides/r2/messages/m3'), { sender: 'DRIVER', text: 'x' }));
  await assertFails(getDoc(doc(as('intruso'), 'rides/r2/messages/m1')));
});

test('chat: al terminar el viaje ya no se puede escribir, pero sí leer', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'rides/r2/messages/old'), { sender: 'PASSENGER', text: 'hola' });
    await updateDoc(doc(ctx.firestore(), 'rides/r2'), { status: 'COMPLETED' });
  });
  await assertSucceeds(getDoc(doc(as('pax1'), 'rides/r2/messages/old')));
  await assertFails(setDoc(doc(as('pax1'), 'rides/r2/messages/m9'), { sender: 'PASSENGER', text: 'tarde' }));
  await assertFails(setDoc(doc(as('driver1'), 'rides/r2/messages/m10'), { sender: 'DRIVER', text: 'tarde' }));
});

test('seguridad: reportes y SOS solo los toca el servidor', async () => {
  await assertFails(setDoc(doc(as('pax1'), 'chat_reports/x'), { reason: 'x' }));
  await assertFails(getDoc(doc(as('pax1'), 'sos_alerts/x')));
});

test('conductor en línea: solo escribes tu ubicación', async () => {
  await assertSucceeds(setDoc(doc(as('driver1'), 'online_drivers/driver1'), { lat: 1, lng: 2 }));
  await assertFails(setDoc(doc(as('pax1'), 'online_drivers/driver1'), { lat: 9, lng: 9 }));
});

test('terminal: reservar asiento solo toca asientos', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'terminal_departures/d1'), { occupiedSeats: [1], price: 40 });
  });
  await assertSucceeds(updateDoc(doc(as('pax1'), 'terminal_departures/d1'), { occupiedSeats: [1, 2] }));
  await assertFails(updateDoc(doc(as('pax1'), 'terminal_departures/d1'), { price: 1 }));
  await assertSucceeds(setDoc(doc(as('pax1'), 'terminal_bookings/b1'), { passengerId: 'pax1', seatNumber: 2 }));
  await assertFails(setDoc(doc(as('pax1'), 'terminal_bookings/b2'), { passengerId: 'otro', seatNumber: 3 }));
  await assertFails(getDoc(doc(as('driver1'), 'terminal_bookings/b1')));
});

test('colecciones desconocidas están cerradas', async () => {
  await assertFails(setDoc(doc(as('pax1'), 'cualquier_cosa/x'), { a: 1 }));
  await assertFails(getDoc(doc(as('pax1'), 'cualquier_cosa/x')));
});
