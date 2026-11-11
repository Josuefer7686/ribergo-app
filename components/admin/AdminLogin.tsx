'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

export function AdminLogin({ configured, onSuccess }: { configured: boolean; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) onSuccess();
      else setError(json.error || 'No se pudo entrar. Intenta de nuevo.');
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-full place-items-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-xl" />
          <div className="leading-tight">
            <p className="font-display text-2xl font-extrabold italic">RIBER <span className="text-gold-primary">GO</span></p>
            <p className="text-sm text-text-secondary">Panel de administración</p>
          </div>
        </div>

        {!configured ? (
          <p className="rounded-xl border border-gold-primary/30 bg-gold-primary/10 p-4 text-sm leading-relaxed text-gold-light">
            El panel todavía no tiene contraseña en el servidor. Faltan las variables <code className="font-mono">ADMIN_PANEL_PASSWORD</code> y <code className="font-mono">ADMIN_SESSION_SECRET</code>.
          </p>
        ) : (
          <>
            <label htmlFor="admin-pass" className="mb-2 block text-sm font-semibold">Contraseña</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden />
              <input
                id="admin-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'admin-error' : undefined}
                className="h-12 w-full rounded-xl border border-white/10 bg-surface pl-10 pr-3 text-base outline-none focus:border-gold-primary/70"
              />
            </div>
            {error && <p id="admin-error" role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={busy || !password}
              className="mt-5 h-12 w-full rounded-xl bg-gold-primary font-black text-background transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
