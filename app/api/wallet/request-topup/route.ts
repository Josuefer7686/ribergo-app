import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9299311110:AAGICHR74xGvZThQP-U2Mbf2Fr0VTB2WN2U';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('receipt') as File | Blob | null;
    const driverId = (formData.get('driverId') as string) || '';
    const driverName = (formData.get('driverName') as string) || 'Conductor';
    const driverPhone = (formData.get('driverPhone') as string) || '';
    const vehicle = (formData.get('vehicle') as string) || 'Mototaxi';
    const amount = Number(formData.get('amount')) || 10;
    const currentBalance = Number(formData.get('currentBalance')) || 0;

    if (!driverId) {
      return NextResponse.json({ ok: false, error: 'Driver ID es requerido' }, { status: 400 });
    }

    const rechargeId = 'rec-' + Date.now();
    const nowMs = Date.now();
    const dateStr = new Date(nowMs).toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 1. Guardar la solicitud en Firestore en estado PENDING
    const rechargeDocRef = doc(db, 'wallet_recharges', rechargeId);
    await setDoc(rechargeDocRef, {
      id: rechargeId,
      driverId,
      driverName,
      driverPhone,
      vehicle,
      amount,
      currentBalance,
      status: 'PENDING',
      createdAtMs: nowMs,
      createdAt: serverTimestamp(),
      formattedDate: dateStr,
    });

    // 2. Obtener el Chat ID del administrador desde Firestore o Variable de entorno
    let adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId) {
      try {
        const configSnap = await getDoc(doc(db, 'system_config', 'telegram_admin'));
        if (configSnap.exists()) {
          adminChatId = configSnap.data()?.chatId;
        }
      } catch (e) {
        console.warn('Error reading telegram_admin config:', e);
      }
    }

    // 3. Si hay administrador configurado y se adjuntó comprobante, despachar a Telegram
    if (adminChatId) {
      const caption = 
`🔔 *NUEVA SOLICITUD DE RECARGA DE SALDO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Conductor:* ${driverName}
🆔 *ID Conductor:* \`${driverId}\`
📱 *Teléfono:* \`${driverPhone}\`
🏍️ *Vehículo:* ${vehicle}
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

      try {
        if (file && file.size > 0) {
          // Envío con fotografía adjunta
          const tgFormData = new FormData();
          tgFormData.append('chat_id', adminChatId);
          tgFormData.append('caption', caption);
          tgFormData.append('parse_mode', 'Markdown');
          tgFormData.append('photo', file);
          tgFormData.append('reply_markup', JSON.stringify(replyMarkup));

          const resTg = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: tgFormData,
          });
          const tgResult = await resTg.json();
          if (!tgResult.ok) {
            console.error('Telegram sendPhoto error:', tgResult);
          }
        } else {
          // Envío en texto si no hay archivo
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminChatId,
              text: caption,
              parse_mode: 'Markdown',
              reply_markup: replyMarkup,
            }),
          });
        }
      } catch (tgErr) {
        console.error('Error sending message to Telegram bot:', tgErr);
      }
    } else {
      console.warn('No hay TELEGRAM_ADMIN_CHAT_ID registrado aún. El admin debe enviar /start al bot.');
    }

    return NextResponse.json({
      ok: true,
      rechargeId,
      status: 'PENDING',
    });
  } catch (err: any) {
    console.error('Error in request-topup route:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Error interno' }, { status: 500 });
  }
}
