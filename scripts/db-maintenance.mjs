#!/usr/bin/env node
/**
 * Mantenimiento de Firestore (usa la llave de administrador de .env.local).
 *
 *   node scripts/db-maintenance.mjs counts
 *   node scripts/db-maintenance.mjs backup
 *   node scripts/db-maintenance.mjs wipe --yes rides active_requests trips_history ...
 *
 * `wipe` SOLO borra las colecciones que le nombres, exige --yes y nunca
 * acepta 'users'. Hace un respaldo automático antes de borrar.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Carga .env.local sin dependencias extra
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}
const account = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString());
const db = getFirestore(initializeApp({ credential: cert(account), projectId: account.project_id }));

const TOP = [
  'users', 'online_drivers', 'driver_boxes', 'rides', 'active_requests', 'trips_history',
  'wallet_recharges', 'terminal_departures', 'terminal_bookings', 'terminal_expresos',
  'terminal_encomiendas', 'system_config',
];

const ser = (v) => {
  if (v === null || v === undefined) return v ?? null;
  if (typeof v.toMillis === 'function') return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(ser);
  if (typeof v === 'object') {
    if (typeof v.path === 'string' && v.firestore) return { __ref: v.path };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ser(x)]));
  }
  return v;
};

async function counts() {
  const out = {};
  for (const c of TOP) out[c] = (await db.collection(c).count().get()).data().count;
  out['messages (todos los chats)'] = (await db.collectionGroup('messages').count().get()).data().count;
  return out;
}

async function backup() {
  const data = {};
  for (const c of TOP) {
    const snap = await db.collection(c).get();
    data[c] = snap.docs.map((d) => ({ id: d.id, data: ser(d.data()) }));
  }
  const msgs = await db.collectionGroup('messages').get();
  data.messages = msgs.docs.map((d) => ({ path: d.ref.path, data: ser(d.data()) }));
  mkdirSync('backups', { recursive: true });
  const name = `backups/firestore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(name, JSON.stringify(data, null, 2));
  return name;
}

async function wipe(names) {
  const result = {};
  for (const name of names) {
    if (name === 'messages') {
      // Los mensajes viven dentro de cada viaje: se borran todos de una vez
      const snap = await db.collectionGroup('messages').get();
      let n = 0;
      for (let i = 0; i < snap.docs.length; i += 400) {
        const b = db.batch();
        snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
        n += Math.min(400, snap.docs.length - i);
      }
      result.messages = n;
      continue;
    }
    const snap = await db.collection(name).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    result[name] = snap.size;
  }
  return result;
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'counts') {
  console.log(JSON.stringify(await counts(), null, 2));
} else if (cmd === 'backup') {
  console.log('Respaldo guardado en', await backup());
} else if (cmd === 'wipe') {
  const names = rest.filter((a) => !a.startsWith('--'));
  if (!rest.includes('--yes')) { console.error('Falta --yes. No se borró nada.'); process.exit(1); }
  if (names.includes('users')) { console.error("Por seguridad este script no borra 'users'."); process.exit(1); }
  const bad = names.filter((n) => n !== 'messages' && !TOP.includes(n));
  if (bad.length || !names.length) { console.error('Colecciones no válidas o vacías:', bad); process.exit(1); }
  console.log('Respaldo previo:', await backup());
  console.log('Borrado (documentos por colección):', JSON.stringify(await wipe(names), null, 2));
  console.log('Estado final:', JSON.stringify(await counts(), null, 2));
} else if (cmd === 'reset-counters') {
  // Pone en cero viajes y calificación de los perfiles. No toca nombre, teléfono, rol, vehículo ni saldo.
  if (!rest.includes('--yes')) { console.error('Falta --yes. No se cambió nada.'); process.exit(1); }
  const snap = await db.collection('users').get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => b.update(d.ref, { trips: 0, rating: null, ratingsCount: 0 }));
    await b.commit();
  }
  console.log(`Contadores en cero en ${snap.size} perfiles.`);
} else {
  console.log('Uso: counts | backup | wipe --yes <colecciones...> | reset-counters --yes');
}
