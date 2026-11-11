import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK (SOLO servidor). Ignora las reglas de Firestore, por eso
 * es la única vía para acreditar saldo y manejar recargas.
 *
 * Credencial: variable FIREBASE_SERVICE_ACCOUNT_B64 con el JSON de la cuenta de
 * servicio codificado en base64 (así no hay problemas con saltos de línea).
 */
function loadServiceAccount(): Record<string, string> | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return null;
  try {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    if (json.private_key) json.private_key = String(json.private_key).replace(/\\n/g, '\n');
    return json;
  } catch (e) {
    console.error('FIREBASE_SERVICE_ACCOUNT_B64 no es un JSON válido en base64');
    return null;
  }
}

let cached: Firestore | null | undefined;

/** Devuelve Firestore con privilegios de administrador, o null si falta la credencial. */
export function getAdminDb(): Firestore | null {
  if (cached !== undefined) return cached;
  const account = loadServiceAccount();
  if (!account) {
    cached = null;
    return cached;
  }
  const app: App = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(account as any), projectId: account.project_id });
  cached = getFirestore(app);
  return cached;
}
