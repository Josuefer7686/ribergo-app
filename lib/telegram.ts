/**
 * Utilidades de servidor para el bot de Telegram de RiberGO.
 * El token y el chat del administrador viven SOLO en variables de entorno.
 */

export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

export const telegramApi = (method: string) =>
  `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`;

/** Escapa los caracteres especiales de Markdown clásico de Telegram. */
export const escapeMarkdown = (text: string): string =>
  String(text).replace(/([_*`\[\]])/g, '\\$1');

/** Compara en tiempo constante para no filtrar el secreto por tiempos de respuesta. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Montos permitidos para recargar (BOB). Deben coincidir con QrTopupModal. */
export const ALLOWED_TOPUP_AMOUNTS = [10, 20, 50, 100] as const;
