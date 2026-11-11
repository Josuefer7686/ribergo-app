import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Sesión del panel de administración.
 *  - La contraseña vive solo en ADMIN_PANEL_PASSWORD (variable de entorno).
 *  - La sesión es una cookie httpOnly firmada con ADMIN_SESSION_SECRET y con
 *    vencimiento; el navegador nunca ve la contraseña ni puede falsificarla.
 */

export const ADMIN_COOKIE = 'rg_admin';
export const SESSION_HOURS = 12;

const PASSWORD = process.env.ADMIN_PANEL_PASSWORD || '';
const SECRET = process.env.ADMIN_SESSION_SECRET || '';

export const adminAuthConfigured = () => PASSWORD.length >= 8 && SECRET.length >= 32;

const sha = (text: string) => createHash('sha256').update(text).digest();

/** Compara contraseñas en tiempo constante. */
export function checkPassword(input: string): boolean {
  if (!adminAuthConfigured()) return false;
  return timingSafeEqual(sha(String(input)), sha(PASSWORD));
}

const sign = (payload: string) => createHmac('sha256', SECRET).update(payload).digest('base64url');

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !adminAuthConfigured()) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export const isAdminRequest = (req: NextRequest) =>
  verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);

// ── Freno a los intentos de contraseña (por IP, en memoria de cada instancia) ──
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) return false;
  return entry.count >= MAX_ATTEMPTS;
}
export function registerFailure(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}
export function clearFailures(ip: string) {
  attempts.delete(ip);
}
