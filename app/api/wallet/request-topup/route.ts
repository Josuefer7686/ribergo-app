import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import {
  TELEGRAM_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID,
  ALLOWED_TOPUP_AMOUNTS,
  escapeMarkdown,
  telegramApi,
} from '@/lib/telegram';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      console.error('request-topup sin configurar: falta TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID');
      return NextResponse.json(
        { ok: false, error: 'El servicio de recargas no está disponible por ahora.' },
        { status: 503 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('request-topup sin Firebase Admin: falta FIREBASE_SERVICE_ACCOUNT_B64');
      return NextResponse.json(
        { ok: false, error: 'El servicio de recargas no está disponible por ahora.' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('receipt') as File | Blob | null;
    const driverId = String(formData.get('driverId') || '').trim();
    const driverName = String(formData.get('driverName') || 'Conductor').slice(0, 80);
    const driverPhone = String(formData.get('driverPhone') || '').slice(0, 30);
    const vehicle = String(formData.get('vehicle') || 'Mototaxi').slice(0, 120);
    const amount = Number(formData.get('amount'));

    if (!driverId) {
      return NextResponse.json({ ok: false, error: 'Driver ID es requerido' }, { status: 400 });
    }
    if (!(ALLOWED_TOPUP_AMOUNTS as readonly number[]).includes(amount)) {
      return NextResponse.json({ ok: false, error: 'Monto de recarga no válido' }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ ok: false, error: 'Adjunta la foto del comprobante' }, { status: 400 });
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({ ok: false, error: 'La foto es demasiado grande (máx. 8 MB)' }, { status: 413 });
    }
    if (file.type && !file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'El comprobante debe ser una imagen' }, { status: 400 });
    }

    // El saldo actual lo lee el servidor; nunca se confía en el que envía el cliente.
    let currentBalance = 0;
    try {
      const userSnap = await adminDb.collection('users').doc(driverId).get();
      if (userSnap.exists) currentBalance = Number(userSnap.data()?.walletBalance) || 0;
    } catch (e) {
      console.warn('No se pudo leer el saldo del conductor:', e);
    }

    const nowMs = Date.now();
    const rechargeId = `rec-${nowMs}-${Math.random().toString(36).slice(2, 6)}`;
    const dateStr = new Date(nowMs).toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 1. La solicitud DEBE quedar guardada: sin ella el admin no podría aprobarla.
    try {
      await adminDb.collection('wallet_recharges').doc(rechargeId).set({
        id: rechargeId,
        driverId,
        driverName,
        driverPhone,
        vehicle,
        amount,
        currentBalance,
        status: 'PENDING',
        createdAtMs: nowMs,
        createdAt: FieldValue.serverTimestamp(),
        formattedDate: dateStr,
      });
    } catch (fsErr) {
      console.error('No se pudo guardar wallet_recharges:', fsErr);
      return NextResponse.json(
        { ok: false, error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' },
        { status: 502 }
      );
    }

    // 2. Enviar el comprobante al administrador
    const caption =
`🔔 *NUEVA SOLICITUD DE RECARGA DE SALDO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Conductor:* ${escapeMarkdown(driverName)}
📱 *Teléfono:* \`${driverPhone.replace(/`/g, '')}\`
🏍️ *Vehículo:* ${escapeMarkdown(vehicle)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Monto Solicitado:* *${amount.toFixed(2)} BOB*
💳 *Saldo:* ${currentBalance.toFixed(2)} BOB  ➔  *${(currentBalance + amount).toFixed(2)} BOB*
⏰ *Fecha y Hora:* \`${dateStr}\`
🔖 *Código:* \`${rechargeId}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Comprueba que la hora del comprobante coincida con esta solicitud y que el dinero figure en tu Yasta / Al Toque.*`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: `✅ Aprobar Recarga (+${amount} BOB)`, callback_data: `approve:${rechargeId}` },
          { text: `❌ Rechazar`, callback_data: `reject:${rechargeId}` },
        ],
      ],
    };

    const tgFormData = new FormData();
    tgFormData.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
    tgFormData.append('caption', caption);
    tgFormData.append('parse_mode', 'Markdown');
    tgFormData.append('photo', file);
    tgFormData.append('reply_markup', JSON.stringify(replyMarkup));

    let delivered = false;
    try {
      const resTg = await fetch(telegramApi('sendPhoto'), { method: 'POST', body: tgFormData });
      const tgResult = await resTg.json();
      delivered = Boolean(tgResult.ok);
      if (!delivered) console.error('Telegram sendPhoto error:', tgResult);
    } catch (tgErr) {
      console.error('Error sending message to Telegram bot:', tgErr);
    }

    if (!delivered) {
      // El admin nunca lo verá: se marca como fallida para que el conductor pueda reintentar.
      try {
        await adminDb
          .collection('wallet_recharges')
          .doc(rechargeId)
          .set({ status: 'FAILED', failedAtMs: Date.now() }, { merge: true });
      } catch {}
      return NextResponse.json(
        { ok: false, error: 'No pudimos enviar tu comprobante a administración. Intenta de nuevo.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, rechargeId, status: 'PENDING' });
  } catch (err: any) {
    console.error('Error in request-topup route:', err);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
