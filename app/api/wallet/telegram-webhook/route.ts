import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import {
  TELEGRAM_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID,
  TELEGRAM_WEBHOOK_SECRET,
  telegramApi,
  safeEqual,
} from '@/lib/telegram';

/**
 * Webhook de Telegram. Seguridad:
 *  1. Exige el secret_token configurado con setWebhook (cabecera
 *     X-Telegram-Bot-Api-Secret-Token); sin él, nadie más puede invocarlo.
 *  2. Solo el administrador (TELEGRAM_ADMIN_CHAT_ID) puede aprobar o rechazar.
 *  3. El monto y el conductor salen SIEMPRE del documento en Firestore,
 *     nunca del texto del mensaje.
 *  4. Aprobar/rechazar es una transacción: solo pasa de PENDING a su estado
 *     final una vez, y el saldo se acredita en el mismo paso.
 */
export async function POST(req: NextRequest) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_WEBHOOK_SECRET) {
    console.error('Webhook de Telegram sin configurar: falta TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const received = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!safeEqual(received, TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    console.error('Webhook sin Firebase Admin: falta FIREBASE_SERVICE_ACCOUNT_B64');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  try {
    const update = await req.json();

    // 1. Mensajes de texto (/start)
    if (update.message) {
      const chatId = update.message.chat.id;
      const senderId = String(update.message.from?.id ?? '');
      const senderName = update.message.from?.first_name || 'Administrador';
      const isAdmin = Boolean(TELEGRAM_ADMIN_CHAT_ID) && senderId === TELEGRAM_ADMIN_CHAT_ID;

      let text: string;
      if (isAdmin) {
        text = `👋 ¡Hola ${senderName}! Estás vinculado como administrador de RiberGO.\n\nCada comprobante de recarga por QR llegará aquí para que lo apruebes o rechaces con un toque.`;
      } else if (!TELEGRAM_ADMIN_CHAT_ID) {
        text = `Este bot aún no tiene administrador configurado.\n\nTu Chat ID es ${senderId}. Si eres el administrador, guárdalo en la variable TELEGRAM_ADMIN_CHAT_ID del servidor.`;
      } else {
        text = 'Este bot es solo para la administración de RiberGO.';
      }

      await fetch(telegramApi('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      return NextResponse.json({ ok: true });
    }

    // 2. Botones [ Aprobar ] / [ Rechazar ]
    if (update.callback_query) {
      const cq = update.callback_query;
      const callbackId: string = cq.id;
      const fromId = String(cq.from?.id ?? '');
      const message = cq.message;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;

      if (!TELEGRAM_ADMIN_CHAT_ID || fromId !== TELEGRAM_ADMIN_CHAT_ID) {
        await answerCallback(callbackId, '⛔ No autorizado.');
        return NextResponse.json({ ok: true });
      }

      const [action, rechargeId] = String(cq.data || '').split(':');
      if (!rechargeId || !/^rec-[A-Za-z0-9-]+$/.test(rechargeId) || (action !== 'approve' && action !== 'reject')) {
        await answerCallback(callbackId, 'Acción inválida');
        return NextResponse.json({ ok: true });
      }

      const rechargeRef = adminDb.collection('wallet_recharges').doc(rechargeId);
      const approving = action === 'approve';
      let amount = 0;

      try {
        await adminDb.runTransaction(async (tx) => {
          const snap = await tx.get(rechargeRef);
          if (!snap.exists) throw new Error('NOT_FOUND');
          const recharge = snap.data() || {};
          if (recharge.status !== 'PENDING') throw new Error(`ALREADY:${recharge.status}`);

          amount = Number(recharge.amount);
          const driverId = String(recharge.driverId || '');
          if (approving && (!Number.isFinite(amount) || amount <= 0 || amount > 1000 || !driverId)) {
            throw new Error('INVALID_RECHARGE');
          }

          if (approving) {
            tx.update(rechargeRef, {
              status: 'APPROVED',
              approvedAtMs: Date.now(),
              approvedAt: FieldValue.serverTimestamp(),
              approvedBy: fromId,
            });
            tx.set(
              adminDb.collection('users').doc(driverId),
              { walletBalance: FieldValue.increment(amount), updatedAt: FieldValue.serverTimestamp() },
              { merge: true }
            );
          } else {
            tx.update(rechargeRef, {
              status: 'REJECTED',
              rejectedAtMs: Date.now(),
              rejectedAt: FieldValue.serverTimestamp(),
              rejectedBy: fromId,
            });
          }
        });
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg === 'NOT_FOUND') {
          await answerCallback(callbackId, '⚠️ No encontré esa recarga en la base de datos.');
        } else if (msg.startsWith('ALREADY:')) {
          const was = msg.split(':')[1] === 'APPROVED' ? 'aprobada' : 'rechazada';
          await answerCallback(callbackId, `⚠️ Esta recarga ya fue ${was} previamente.`);
        } else if (msg === 'INVALID_RECHARGE') {
          await answerCallback(callbackId, '⚠️ La recarga tiene datos inválidos. No se acreditó nada.');
        } else {
          console.error('Error procesando recarga:', err);
          await answerCallback(callbackId, '⚠️ Error al guardar. No se acreditó nada; intenta de nuevo.');
        }
        return NextResponse.json({ ok: true });
      }

      const timeStr = new Date().toLocaleTimeString('es-BO', {
        timeZone: 'America/La_Paz',
        hour: '2-digit',
        minute: '2-digit',
      });

      await answerCallback(
        callbackId,
        approving ? `✅ ¡Recarga de ${amount} BOB aprobada con éxito!` : '❌ Recarga rechazada.'
      );

      if (chatId && messageId) {
        const stamp = approving
          ? `✅ RECARGA APROBADA (+${amount} BOB)\n👤 Aprobada a las ${timeStr} hrs.\n💰 Saldo acreditado al conductor.`
          : `❌ RECARGA RECHAZADA\n👤 Rechazada a las ${timeStr} hrs.`;
        const original = message.caption ?? message.text ?? '';
        const editMethod = message.caption !== undefined ? 'editMessageCaption' : 'editMessageText';
        await fetch(telegramApi(editMethod), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            ...(editMethod === 'editMessageCaption'
              ? { caption: `${original}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${stamp}` }
              : { text: `${original}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${stamp}` }),
            reply_markup: { inline_keyboard: [] },
          }),
        }).catch((e) => console.warn('No se pudo editar el mensaje de Telegram:', e));
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Responder 200 evita que Telegram reintente en bucle una petición defectuosa.
    console.error('Error handling Telegram webhook:', err);
    return NextResponse.json({ ok: true });
  }
}

async function answerCallback(callbackQueryId: string, text: string) {
  try {
    await fetch(telegramApi('answerCallbackQuery'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true }),
    });
  } catch (e) {
    console.warn('Error answering Telegram callback query:', e);
  }
}
