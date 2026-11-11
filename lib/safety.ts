import 'server-only';
import type { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { TELEGRAM_ADMIN_CHAT_ID, TELEGRAM_TOKEN, telegramApi } from '@/lib/telegram';

/** Devuelve el uid del usuario que llama (token de Firebase en `Authorization: Bearer`), o null. */
export async function verifyCaller(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    return (await auth.verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

/** Aviso al administrador por Telegram. Nunca falla: si no hay bot, solo queda en el panel. */
export async function notifyAdmin(text: string): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    await fetch(telegramApi('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text: text.slice(0, 3900), disable_web_page_preview: true }),
    });
  } catch (e) {
    console.warn('No se pudo avisar por Telegram:', e);
  }
}

/** Manda las fotos de una verificación y el mensaje con botones [Aprobar] / [Rechazar]. */
export async function notifyVerification(uid: string, summary: string, photos: { label: string; dataUrl: string }[]): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    const form = new FormData();
    form.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
    const media = photos.map((p, i) => {
      const bytes = Buffer.from(p.dataUrl.split(',')[1], 'base64');
      form.append(`photo${i}`, new Blob([bytes], { type: 'image/jpeg' }), `photo${i}.jpg`);
      return { type: 'photo', media: `attach://photo${i}`, caption: p.label };
    });
    form.append('media', JSON.stringify(media));
    await fetch(telegramApi('sendMediaGroup'), { method: 'POST', body: form });
    await fetch(telegramApi('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: summary.slice(0, 3900),
        reply_markup: { inline_keyboard: [[
          { text: '✅ Aprobar', callback_data: `vok:${uid}` },
          { text: '❌ Rechazar', callback_data: `vno:${uid}` },
        ]] },
      }),
    });
  } catch (e) {
    console.warn('No se pudo enviar la verificación por Telegram:', e);
  }
}
