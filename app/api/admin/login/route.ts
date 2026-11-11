import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE, SESSION_HOURS, adminAuthConfigured, checkPassword, clearFailures,
  createSessionToken, isAdminRequest, rateLimited, registerFailure,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const clientIp = (req: NextRequest) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

/** ¿Hay sesión? (el panel lo usa para decidir si muestra el login) */
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: isAdminRequest(req), configured: adminAuthConfigured() });
}

export async function POST(req: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ ok: false, error: 'El panel aún no está configurado en el servidor.' }, { status: 503 });
  }
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera 10 minutos.' }, { status: 429 });
  }

  let password = '';
  try {
    password = String((await req.json())?.password ?? '');
  } catch {}

  if (!checkPassword(password)) {
    registerFailure(ip);
    // pausa corta para encarecer los intentos automáticos
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta.' }, { status: 401 });
  }

  clearFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return res;
}
